import { Router } from "express";
import { requireAuth, type AuthObject } from "@clerk/express";
import { db } from "@workspace/db";
import { aiConversationsTable, aiMessagesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import OpenAI from "openai";
import { logger } from "../lib/logger";
import { getOrCreateUser } from "./users";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Eres un asesor experto en bienes raíces en México. Ayudas a inversionistas mexicanos con análisis de propiedades, cálculo de ROI, análisis de zonas, tendencias del mercado inmobiliario y estrategias de inversión. 

Responde siempre en español de México. Sé conciso pero informativo. Cuando analices propiedades o zonas, proporciona datos estructurados si es relevante.

Cuando el usuario pida análisis de propiedades específicas, calcula métricas como: precio por m², rendimiento de renta anual, cap rate, flujo de caja mensual, y retorno sobre inversión estimado.

Si generas datos estructurados de análisis, inclúyelos al final en formato JSON dentro de marcadores especiales:
<<<STRUCTURED_DATA>>>
{ "tipo": "analisis_propiedad", "datos": { ... } }
<<<END_STRUCTURED_DATA>>>`;

router.get("/ai/conversations", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const convos = await db.select().from(aiConversationsTable).where(eq(aiConversationsTable.userId, user.id));
    return res.json(convos);
  } catch (err) {
    logger.error({ err }, "Error listing conversations");
    return res.status(500).json({ error: "Error listing conversations" });
  }
});

router.post("/ai/conversations", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const { title } = req.body;
    const [created] = await db.insert(aiConversationsTable).values({ userId: user.id, title: title || "Nueva conversación" }).returning();
    return res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, "Error creating conversation");
    return res.status(500).json({ error: "Error creating conversation" });
  }
});

router.get("/ai/conversations/:id", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const convo = await db.query.aiConversationsTable.findFirst({
      where: and(eq(aiConversationsTable.id, parseInt(String(req.params.id))), eq(aiConversationsTable.userId, user.id)),
    });
    if (!convo) return res.status(404).json({ error: "Not found" });
    const messages = await db.select().from(aiMessagesTable).where(eq(aiMessagesTable.conversationId, convo.id));
    return res.json({ ...convo, messages });
  } catch (err) {
    logger.error({ err }, "Error getting conversation");
    return res.status(500).json({ error: "Error getting conversation" });
  }
});

router.delete("/ai/conversations/:id", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const conversationId = parseInt(String(req.params.id));

    const convo = await db.query.aiConversationsTable.findFirst({
      where: and(eq(aiConversationsTable.id, conversationId), eq(aiConversationsTable.userId, user.id)),
    });
    if (!convo) return res.status(404).json({ error: "Not found" });

    await db.delete(aiMessagesTable).where(eq(aiMessagesTable.conversationId, conversationId));
    await db.delete(aiConversationsTable).where(
      and(eq(aiConversationsTable.id, conversationId), eq(aiConversationsTable.userId, user.id))
    );
    return res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Error deleting conversation");
    return res.status(500).json({ error: "Error deleting conversation" });
  }
});

router.post("/ai/conversations/:id/messages", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const conversationId = parseInt(String(req.params.id));

    const convo = await db.query.aiConversationsTable.findFirst({
      where: and(eq(aiConversationsTable.id, conversationId), eq(aiConversationsTable.userId, user.id)),
    });
    if (!convo) return res.status(404).json({ error: "Conversation not found" });

    const { content } = req.body;

    await db.insert(aiMessagesTable).values({ conversationId, role: "user", content });

    const history = await db.select().from(aiMessagesTable).where(eq(aiMessagesTable.conversationId, conversationId));
    const messages = history.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    });

    const rawContent = completion.choices[0]?.message?.content ?? "Lo siento, no pude generar una respuesta.";

    let content_clean = rawContent;
    let structuredData: any = null;

    const structuredMatch = rawContent.match(/<<<STRUCTURED_DATA>>>([\s\S]*?)<<<END_STRUCTURED_DATA>>>/);
    if (structuredMatch) {
      try {
        structuredData = JSON.parse(structuredMatch[1].trim());
        content_clean = rawContent.replace(/<<<STRUCTURED_DATA>>>[\s\S]*?<<<END_STRUCTURED_DATA>>>/, "").trim();
      } catch {
        content_clean = rawContent;
      }
    }

    const [assistantMsg] = await db.insert(aiMessagesTable).values({
      conversationId,
      role: "assistant",
      content: content_clean,
      structuredData,
    }).returning();

    return res.json(assistantMsg);
  } catch (err) {
    logger.error({ err }, "Error sending message");
    return res.status(500).json({ error: "Error sending message" });
  }
});

export default router;

import { Router } from "express";
import { requireAuth, type AuthObject } from "@clerk/express";
import { db } from "@workspace/db";
import { notificationsTable, propertiesTable } from "@workspace/db";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getOrCreateUser } from "./users";

const router = Router();

router.get("/notifications", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const notifs = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, user.id));
    return res.json(notifs);
  } catch (err) {
    logger.error({ err }, "Error listing notifications");
    return res.status(500).json({ error: "Error listing notifications" });
  }
});

router.get("/notifications/unread-count", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const notifs = await db.select().from(notificationsTable).where(
      and(eq(notificationsTable.userId, user.id), eq(notificationsTable.read, false))
    );
    return res.json({ count: notifs.length });
  } catch (err) {
    logger.error({ err }, "Error getting unread count");
    return res.status(500).json({ error: "Error getting unread count" });
  }
});

router.patch("/notifications/:id/read", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const [updated] = await db.update(notificationsTable)
      .set({ read: true })
      .where(and(eq(notificationsTable.id, parseInt(String(req.params.id))), eq(notificationsTable.userId, user.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err) {
    logger.error({ err }, "Error marking notification read");
    return res.status(500).json({ error: "Error marking read" });
  }
});

router.post("/notifications/check-inspections", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);

    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    const allUserProperties = await db.select().from(propertiesTable).where(
      and(
        eq(propertiesTable.userId, user.id),
        isNotNull(propertiesTable.nextInspectionDate)
      )
    );
    const dueProperties = allUserProperties.filter(p => {
      if (!p.nextInspectionDate) return false;
      const d = new Date(p.nextInspectionDate);
      return d <= in7Days;
    });

    let created = 0;
    for (const prop of dueProperties) {
      if (!prop.nextInspectionDate) continue;
      const inspDate = new Date(prop.nextInspectionDate);
      const isOverdue = inspDate < now;
      const existing = await db.select().from(notificationsTable).where(
        and(
          eq(notificationsTable.userId, user.id),
          eq(notificationsTable.type, "inspection_due"),
          eq(notificationsTable.entityId, prop.id),
          eq(notificationsTable.read, false)
        )
      );
      if (existing.length === 0) {
        const title = isOverdue
          ? `Inspección vencida: ${prop.title}`
          : `Inspección próxima: ${prop.title}`;
        const body = isOverdue
          ? `La inspección programada para el ${inspDate.toLocaleDateString('es-MX')} está vencida.`
          : `Tienes una inspección programada para el ${inspDate.toLocaleDateString('es-MX')}.`;
        await db.insert(notificationsTable).values({
          userId: user.id,
          type: "inspection_due",
          title,
          body,
          entityType: "property",
          entityId: prop.id,
        });
        created++;
      }
    }
    return res.json({ created });
  } catch (err) {
    logger.error({ err }, "Error checking inspections");
    return res.status(500).json({ error: "Error checking inspections" });
  }
});

router.patch("/notifications/read-all", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.userId, user.id));
    return res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Error marking all read");
    return res.status(500).json({ error: "Error marking all read" });
  }
});

export default router;

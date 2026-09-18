import { Router } from "express";
import { requireAuth, type AuthObject } from "@clerk/express";
import { db } from "@workspace/db";
import { zonesTable, zoneNotesTable } from "@workspace/db";
import { eq, and, ilike, or } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getOrCreateUser } from "./users";

const router = Router();

function serializeZone(z: any) {
  return {
    id: z.id,
    name: z.name,
    city: z.city,
    pricePerM2: parseFloat(z.pricePerM2),
    annualGrowthPct: parseFloat(z.annualGrowthPct),
    rentalYieldPct: parseFloat(z.rentalYieldPct),
    description: z.description ?? null,
    createdAt: z.createdAt,
  };
}

router.get("/zones", async (req, res) => {
  try {
    const q = req.query.q as string | undefined;
    let zones;
    if (q) {
      zones = await db.select().from(zonesTable).where(
        or(ilike(zonesTable.name, `%${q}%`), ilike(zonesTable.city, `%${q}%`))
      );
    } else {
      zones = await db.select().from(zonesTable);
    }
    return res.json(zones.map(serializeZone));
  } catch (err) {
    logger.error({ err }, "Error listing zones");
    return res.status(500).json({ error: "Error listing zones" });
  }
});

router.get("/zones/:id", async (req, res) => {
  try {
    const zone = await db.query.zonesTable.findFirst({ where: eq(zonesTable.id, parseInt(String(req.params.id))) });
    if (!zone) return res.status(404).json({ error: "Not found" });
    return res.json(serializeZone(zone));
  } catch (err) {
    logger.error({ err }, "Error getting zone");
    return res.status(500).json({ error: "Error getting zone" });
  }
});

router.get("/zone-notes", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const notes = await db.select().from(zoneNotesTable).where(eq(zoneNotesTable.userId, user.id));
    const zoneIds = [...new Set(notes.map(n => n.zoneId))];
    const zones = zoneIds.length > 0 ? await db.select().from(zonesTable) : [];
    const zoneMap = new Map(zones.map(z => [z.id, z]));
    return res.json(notes.map(n => ({ ...n, zone: serializeZone(zoneMap.get(n.zoneId)) })));
  } catch (err) {
    logger.error({ err }, "Error listing zone notes");
    return res.status(500).json({ error: "Error listing zone notes" });
  }
});

router.get("/zone-notes/:zoneId", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const note = await db.query.zoneNotesTable.findFirst({
      where: and(eq(zoneNotesTable.userId, user.id), eq(zoneNotesTable.zoneId, parseInt(String(req.params.zoneId)))),
    });
    if (!note) return res.status(404).json({ error: "Not found" });
    const zone = await db.query.zonesTable.findFirst({ where: eq(zonesTable.id, note.zoneId) });
    return res.json({ ...note, zone: serializeZone(zone) });
  } catch (err) {
    logger.error({ err }, "Error getting zone note");
    return res.status(500).json({ error: "Error getting zone note" });
  }
});

router.put("/zone-notes/:zoneId", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const zoneId = parseInt(String(req.params.zoneId));
    const { content } = req.body;
    const existing = await db.query.zoneNotesTable.findFirst({
      where: and(eq(zoneNotesTable.userId, user.id), eq(zoneNotesTable.zoneId, zoneId)),
    });
    let note;
    if (existing) {
      [note] = await db.update(zoneNotesTable).set({ content }).where(eq(zoneNotesTable.id, existing.id)).returning();
    } else {
      [note] = await db.insert(zoneNotesTable).values({ userId: user.id, zoneId, content }).returning();
    }
    const zone = await db.query.zonesTable.findFirst({ where: eq(zonesTable.id, zoneId) });
    return res.json({ ...note, zone: serializeZone(zone) });
  } catch (err) {
    logger.error({ err }, "Error upserting zone note");
    return res.status(500).json({ error: "Error upserting zone note" });
  }
});

export default router;

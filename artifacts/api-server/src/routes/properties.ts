import { Router } from "express";
import { requireAuth, type AuthObject } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, propertiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getOrCreateUser } from "./users";

const router = Router();

function serializeProperty(p: any) {
  return {
    id: p.id,
    userId: p.userId,
    title: p.title,
    address: p.address,
    city: p.city,
    neighborhood: p.neighborhood ?? null,
    propertyType: p.propertyType,
    status: p.status,
    purchasePrice: parseFloat(p.purchasePrice),
    currentValue: p.currentValue ? parseFloat(p.currentValue) : null,
    rentAmount: p.rentAmount ? parseFloat(p.rentAmount) : null,
    expensesMonthly: p.expensesMonthly ? parseFloat(p.expensesMonthly) : null,
    netIncome: p.netIncome ? parseFloat(p.netIncome) : null,
    occupancyRate: p.occupancyRate ? parseFloat(p.occupancyRate) : null,
    nextInspectionDate: p.nextInspectionDate ?? null,
    images: p.images ?? [],
    isPublic: p.isPublic,
    createdAt: p.createdAt,
  };
}

router.get("/properties", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const props = await db.select().from(propertiesTable).where(eq(propertiesTable.userId, user.id));
    return res.json(props.map(serializeProperty));
  } catch (err) {
    logger.error({ err }, "Error listing properties");
    return res.status(500).json({ error: "Error listing properties" });
  }
});

router.post("/properties", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const { title, address, city, neighborhood, propertyType, status, purchasePrice, currentValue, rentAmount, expensesMonthly, netIncome, occupancyRate, nextInspectionDate, images, isPublic } = req.body;
    const [created] = await db.insert(propertiesTable).values({
      userId: user.id,
      title, address, city, neighborhood,
      propertyType, status: status ?? "activa",
      purchasePrice: String(purchasePrice),
      currentValue: currentValue ? String(currentValue) : null,
      rentAmount: rentAmount ? String(rentAmount) : null,
      expensesMonthly: expensesMonthly ? String(expensesMonthly) : null,
      netIncome: netIncome ? String(netIncome) : null,
      occupancyRate: occupancyRate ? String(occupancyRate) : null,
      nextInspectionDate,
      images: images ?? [],
      isPublic: isPublic ?? false,
    }).returning();
    return res.status(201).json(serializeProperty(created));
  } catch (err) {
    logger.error({ err }, "Error creating property");
    return res.status(500).json({ error: "Error creating property" });
  }
});

router.get("/properties/portfolio-summary", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const props = await db.select().from(propertiesTable).where(eq(propertiesTable.userId, user.id));

    const totalValue = props.reduce((s, p) => s + parseFloat(p.currentValue ?? p.purchasePrice), 0);
    const totalMonthlyIncome = props.reduce((s, p) => s + parseFloat(p.rentAmount ?? "0"), 0);
    const occupancies = props.filter(p => p.occupancyRate).map(p => parseFloat(p.occupancyRate!));
    const avgOccupancy = occupancies.length > 0 ? occupancies.reduce((a, b) => a + b, 0) / occupancies.length : 0;

    const now = new Date();
    const overdueInspections = props.filter(p => {
      if (!p.nextInspectionDate) return false;
      return new Date(p.nextInspectionDate) < now;
    }).length;

    const valueHistory = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - (5 - i));
      const factor = 1 + (i * 0.01);
      return {
        month: d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" }),
        value: Math.round(totalValue * factor),
      };
    });

    return res.json({ totalValue, totalMonthlyIncome, avgOccupancy, propertyCount: props.length, overdueInspections, valueHistory });
  } catch (err) {
    logger.error({ err }, "Error getting portfolio summary");
    return res.status(500).json({ error: "Error getting portfolio summary" });
  }
});

router.get("/properties/:id", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const prop = await db.query.propertiesTable.findFirst({
      where: and(eq(propertiesTable.id, parseInt(String(req.params.id))), eq(propertiesTable.userId, user.id)),
    });
    if (!prop) return res.status(404).json({ error: "Not found" });
    return res.json(serializeProperty(prop));
  } catch (err) {
    logger.error({ err }, "Error getting property");
    return res.status(500).json({ error: "Error getting property" });
  }
});

router.patch("/properties/:id", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const { title, address, city, neighborhood, propertyType, status, purchasePrice, currentValue, rentAmount, expensesMonthly, netIncome, occupancyRate, nextInspectionDate, images, isPublic } = req.body;
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (neighborhood !== undefined) updates.neighborhood = neighborhood;
    if (propertyType !== undefined) updates.propertyType = propertyType;
    if (status !== undefined) updates.status = status;
    if (purchasePrice !== undefined) updates.purchasePrice = String(purchasePrice);
    if (currentValue !== undefined) updates.currentValue = String(currentValue);
    if (rentAmount !== undefined) updates.rentAmount = String(rentAmount);
    if (expensesMonthly !== undefined) updates.expensesMonthly = String(expensesMonthly);
    if (netIncome !== undefined) updates.netIncome = String(netIncome);
    if (occupancyRate !== undefined) updates.occupancyRate = String(occupancyRate);
    if (nextInspectionDate !== undefined) updates.nextInspectionDate = nextInspectionDate;
    if (images !== undefined) updates.images = images;
    if (isPublic !== undefined) updates.isPublic = isPublic;
    const [updated] = await db.update(propertiesTable).set(updates)
      .where(and(eq(propertiesTable.id, parseInt(String(req.params.id))), eq(propertiesTable.userId, user.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(serializeProperty(updated));
  } catch (err) {
    logger.error({ err }, "Error updating property");
    return res.status(500).json({ error: "Error updating property" });
  }
});

router.delete("/properties/:id", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    await db.delete(propertiesTable).where(
      and(eq(propertiesTable.id, parseInt(String(req.params.id))), eq(propertiesTable.userId, user.id))
    );
    return res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Error deleting property");
    return res.status(500).json({ error: "Error deleting property" });
  }
});

export default router;

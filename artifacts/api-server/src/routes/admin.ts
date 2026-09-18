import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, propertiesTable, projectsTable, investmentInterestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getOrCreateUser, serializeUser } from "./users";

const router = Router();

async function requireAdminMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    if (user.role !== "admin") {
      res.status(403).json({ error: "Admin required" });
      return;
    }
    (req as any).adminUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

router.use(requireAuth());
router.use(requireAdminMiddleware);

router.get("/admin/stats", async (req, res) => {
  try {
    const users = await db.select().from(usersTable);
    const properties = await db.select().from(propertiesTable);
    const projects = await db.select().from(projectsTable).where(eq(projectsTable.status, "construccion"));
    const pendingInterests = await db.select().from(investmentInterestsTable).where(eq(investmentInterestsTable.status, "pendiente"));
    const totalAum = properties.reduce((s, p) => s + parseFloat(p.currentValue ?? p.purchasePrice), 0);

    return res.json({
      totalUsers: users.length,
      totalProperties: properties.length,
      activeProjects: projects.length,
      totalAum,
      pendingInterests: pendingInterests.length,
    });
  } catch (err) {
    logger.error({ err }, "Error getting admin stats");
    return res.status(500).json({ error: "Error getting admin stats" });
  }
});

router.get("/admin/users", async (req, res) => {
  try {
    const users = await db.select().from(usersTable);
    return res.json(users.map(serializeUser));
  } catch (err) {
    logger.error({ err }, "Error listing admin users");
    return res.status(500).json({ error: "Error listing users" });
  }
});

router.patch("/admin/users/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    const [updated] = await db.update(usersTable).set({ role }).where(eq(usersTable.id, parseInt(String(req.params.id)))).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(serializeUser(updated));
  } catch (err) {
    logger.error({ err }, "Error updating user role");
    return res.status(500).json({ error: "Error updating user role" });
  }
});

router.get("/admin/properties", async (req, res) => {
  try {
    const props = await db.select().from(propertiesTable);
    return res.json(props.map(p => ({
      id: p.id, userId: p.userId, title: p.title, address: p.address, city: p.city,
      neighborhood: p.neighborhood ?? null, propertyType: p.propertyType, status: p.status,
      purchasePrice: parseFloat(p.purchasePrice), currentValue: p.currentValue ? parseFloat(p.currentValue) : null,
      rentAmount: p.rentAmount ? parseFloat(p.rentAmount) : null,
      expensesMonthly: p.expensesMonthly ? parseFloat(p.expensesMonthly) : null,
      netIncome: p.netIncome ? parseFloat(p.netIncome) : null,
      occupancyRate: p.occupancyRate ? parseFloat(p.occupancyRate) : null,
      nextInspectionDate: p.nextInspectionDate ?? null,
      images: p.images ?? [], isPublic: p.isPublic, createdAt: p.createdAt,
    })));
  } catch (err) {
    logger.error({ err }, "Error listing admin properties");
    return res.status(500).json({ error: "Error listing properties" });
  }
});

router.get("/admin/investment-interests", async (req, res) => {
  try {
    const interests = await db.select().from(investmentInterestsTable);
    const users = await db.select().from(usersTable);
    const projects = await db.select().from(projectsTable);
    const userMap = new Map(users.map(u => [u.id, u]));
    const projectMap = new Map(projects.map(p => [p.id, p]));
    return res.json(interests.map(i => ({
      id: i.id, userId: i.userId, projectId: i.projectId,
      amountInterested: i.amountInterested ? parseFloat(i.amountInterested) : null,
      message: i.message ?? null, status: i.status, createdAt: i.createdAt,
      project: projectMap.get(i.projectId) ? {
        id: projectMap.get(i.projectId)!.id,
        userId: projectMap.get(i.projectId)!.userId,
        title: projectMap.get(i.projectId)!.title,
        location: projectMap.get(i.projectId)!.location,
        description: projectMap.get(i.projectId)!.description ?? null,
        type: projectMap.get(i.projectId)!.type ?? null,
        status: projectMap.get(i.projectId)!.status,
        roiEstimated: projectMap.get(i.projectId)!.roiEstimated ? parseFloat(projectMap.get(i.projectId)!.roiEstimated!) : null,
        totalInvestment: projectMap.get(i.projectId)!.totalInvestment ? parseFloat(projectMap.get(i.projectId)!.totalInvestment!) : null,
        raisedAmount: projectMap.get(i.projectId)!.raisedAmount ? parseFloat(projectMap.get(i.projectId)!.raisedAmount!) : null,
        phases: projectMap.get(i.projectId)!.phases ?? [],
        isPublic: projectMap.get(i.projectId)!.isPublic,
        images: projectMap.get(i.projectId)!.images ?? [],
        investorCount: projectMap.get(i.projectId)!.investorCount ?? 0,
        createdAt: projectMap.get(i.projectId)!.createdAt,
      } : null,
      user: userMap.get(i.userId) ? serializeUser(userMap.get(i.userId)!) : null,
    })));
  } catch (err) {
    logger.error({ err }, "Error listing admin investment interests");
    return res.status(500).json({ error: "Error listing investment interests" });
  }
});

router.patch("/admin/investment-interests/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const [updated] = await db.update(investmentInterestsTable).set({ status })
      .where(eq(investmentInterestsTable.id, parseInt(String(req.params.id))))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, updated.projectId) });
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, updated.userId) });
    return res.json({
      id: updated.id, userId: updated.userId, projectId: updated.projectId,
      amountInterested: updated.amountInterested ? parseFloat(updated.amountInterested) : null,
      message: updated.message ?? null, status: updated.status, createdAt: updated.createdAt,
      project: project ? {
        id: project.id, userId: project.userId, title: project.title, location: project.location,
        description: project.description ?? null, type: project.type ?? null, status: project.status,
        roiEstimated: project.roiEstimated ? parseFloat(project.roiEstimated) : null,
        totalInvestment: project.totalInvestment ? parseFloat(project.totalInvestment) : null,
        raisedAmount: project.raisedAmount ? parseFloat(project.raisedAmount) : null,
        phases: project.phases ?? [], isPublic: project.isPublic, images: project.images ?? [],
        investorCount: project.investorCount ?? 0, createdAt: project.createdAt,
      } : null,
      user: user ? serializeUser(user) : null,
    });
  } catch (err) {
    logger.error({ err }, "Error updating investment interest status");
    return res.status(500).json({ error: "Error updating status" });
  }
});

export default router;

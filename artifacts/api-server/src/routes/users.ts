import { Router } from "express";
import { requireAuth, type AuthObject } from "@clerk/express";
import { db } from "@workspace/db";
import { usersTable, propertiesTable, projectsTable } from "@workspace/db";
import { eq, sum, avg, count, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

async function getOrCreateUser(clerkId: string, email: string, fullName?: string, avatarUrl?: string) {
  let user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) {
    const [created] = await db.insert(usersTable).values({ clerkId, email, fullName, avatarUrl }).returning();
    user = created;
  }
  return user;
}

router.get("/users/me", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const clerkUserId = auth.userId!;
    const clerkUser = await auth.getToken?.();
    const user = await getOrCreateUser(clerkUserId, `${clerkUserId}@clerk.user`);
    return res.json(serializeUser(user));
  } catch (err) {
    logger.error({ err }, "Error getting me");
    return res.status(500).json({ error: "Error getting user" });
  }
});

router.patch("/users/me", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const clerkUserId = auth.userId!;
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkUserId) });
    if (!user) return res.status(404).json({ error: "User not found" });
    const { fullName, avatarUrl, investorType, bio, notificationPrefs, onboardingCompleted } = req.body;
    const updates: any = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (investorType !== undefined) updates.investorType = investorType;
    if (bio !== undefined) updates.bio = bio;
    if (notificationPrefs !== undefined) updates.notificationPrefs = notificationPrefs;
    if (onboardingCompleted !== undefined) updates.onboardingCompleted = onboardingCompleted;
    const [updated] = await db.update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, user.id))
      .returning();
    return res.json(serializeUser(updated));
  } catch (err) {
    logger.error({ err }, "Error updating me");
    return res.status(500).json({ error: "Error updating user" });
  }
});

router.get("/users/me/stats", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const clerkUserId = auth.userId!;
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkUserId) });
    if (!user) return res.json({ totalProperties: 0, totalPortfolioValue: 0, totalMonthlyIncome: 0, avgRoi: 0, activeProjects: 0 });

    const properties = await db.select().from(propertiesTable).where(eq(propertiesTable.userId, user.id));
    const totalPortfolioValue = properties.reduce((sum, p) => sum + parseFloat(p.currentValue ?? p.purchasePrice), 0);
    const totalMonthlyIncome = properties.reduce((sum, p) => sum + parseFloat(p.rentAmount ?? "0"), 0);

    const projects = await db.select().from(projectsTable).where(
      and(eq(projectsTable.userId, user.id), eq(projectsTable.status, "construccion"))
    );

    return res.json({
      totalProperties: properties.length,
      totalPortfolioValue,
      totalMonthlyIncome,
      avgRoi: properties.length > 0 
        ? properties.reduce((s, p) => {
            const roi = parseFloat(p.rentAmount ?? "0") * 12 / parseFloat(p.purchasePrice) * 100;
            return s + roi;
          }, 0) / properties.length
        : 0,
      activeProjects: projects.length,
    });
  } catch (err) {
    logger.error({ err }, "Error getting stats");
    return res.status(500).json({ error: "Error getting stats" });
  }
});

function serializeUser(user: any) {
  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    fullName: user.fullName ?? null,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    investorType: user.investorType ?? null,
    bio: user.bio ?? null,
    notificationPrefs: user.notificationPrefs ?? null,
    onboardingCompleted: user.onboardingCompleted ?? null,
    createdAt: user.createdAt,
  };
}

export { getOrCreateUser, serializeUser };
export default router;

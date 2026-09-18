import { Router } from "express";
import { requireAuth, type AuthObject } from "@clerk/express";
import { db } from "@workspace/db";
import { investmentInterestsTable, projectsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getOrCreateUser, serializeUser } from "./users";

const router = Router();

function serializeInterest(i: any, project?: any, user?: any) {
  return {
    id: i.id,
    userId: i.userId,
    projectId: i.projectId,
    amountInterested: i.amountInterested ? parseFloat(i.amountInterested) : null,
    message: i.message ?? null,
    status: i.status,
    createdAt: i.createdAt,
    project: project ?? null,
    user: user ?? null,
  };
}

router.get("/investment-interests", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const interests = await db.select().from(investmentInterestsTable).where(eq(investmentInterestsTable.userId, user.id));
    const projectIds = [...new Set(interests.map(i => i.projectId))];
    const projects = projectIds.length > 0 ? await db.select().from(projectsTable) : [];
    const projectMap = new Map(projects.map(p => [p.id, p]));

    return res.json(interests.map(i => serializeInterest(i, projectMap.get(i.projectId), serializeUser(user))));
  } catch (err) {
    logger.error({ err }, "Error listing investment interests");
    return res.status(500).json({ error: "Error listing investment interests" });
  }
});

router.post("/investment-interests", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const { projectId, amountInterested, message } = req.body;
    const [created] = await db.insert(investmentInterestsTable).values({
      userId: user.id,
      projectId,
      amountInterested: amountInterested ? String(amountInterested) : null,
      message,
    }).returning();
    const project = await db.query.projectsTable.findFirst({ where: eq(projectsTable.id, projectId) });
    return res.status(201).json(serializeInterest(created, project, serializeUser(user)));
  } catch (err) {
    logger.error({ err }, "Error creating investment interest");
    return res.status(500).json({ error: "Error creating investment interest" });
  }
});

export default router;

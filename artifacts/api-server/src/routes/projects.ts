import { Router } from "express";
import { requireAuth, type AuthObject } from "@clerk/express";
import { db } from "@workspace/db";
import { projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getOrCreateUser } from "./users";

const router = Router();

function serializeProject(p: any) {
  return {
    id: p.id,
    userId: p.userId,
    title: p.title,
    location: p.location,
    description: p.description ?? null,
    type: p.type ?? null,
    status: p.status,
    roiEstimated: p.roiEstimated ? parseFloat(p.roiEstimated) : null,
    totalInvestment: p.totalInvestment ? parseFloat(p.totalInvestment) : null,
    raisedAmount: p.raisedAmount ? parseFloat(p.raisedAmount) : null,
    phases: p.phases ?? [],
    isPublic: p.isPublic,
    images: p.images ?? [],
    investorCount: p.investorCount ?? 0,
    createdAt: p.createdAt,
  };
}

router.get("/projects", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const projects = await db.select().from(projectsTable).where(eq(projectsTable.userId, user.id));
    return res.json(projects.map(serializeProject));
  } catch (err) {
    logger.error({ err }, "Error listing projects");
    return res.status(500).json({ error: "Error listing projects" });
  }
});

router.get("/projects/public", async (req, res) => {
  try {
    const projects = await db.select().from(projectsTable).where(eq(projectsTable.isPublic, true));
    return res.json(projects.map(serializeProject));
  } catch (err) {
    logger.error({ err }, "Error listing public projects");
    return res.status(500).json({ error: "Error listing public projects" });
  }
});

router.post("/projects", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const { title, location, description, type, status, roiEstimated, totalInvestment, raisedAmount, phases, isPublic, images } = req.body;
    const [created] = await db.insert(projectsTable).values({
      userId: user.id,
      title, location, description, type,
      status: status ?? "preventa",
      roiEstimated: roiEstimated ? String(roiEstimated) : null,
      totalInvestment: totalInvestment ? String(totalInvestment) : null,
      raisedAmount: raisedAmount ? String(raisedAmount) : null,
      phases: phases ?? [],
      isPublic: isPublic ?? false,
      images: images ?? [],
    }).returning();
    return res.status(201).json(serializeProject(created));
  } catch (err) {
    logger.error({ err }, "Error creating project");
    return res.status(500).json({ error: "Error creating project" });
  }
});

router.get("/projects/:id", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const project = await db.query.projectsTable.findFirst({
      where: eq(projectsTable.id, parseInt(String(req.params.id))),
    });
    if (!project) return res.status(404).json({ error: "Not found" });
    if (!project.isPublic && project.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.json(serializeProject(project));
  } catch (err) {
    logger.error({ err }, "Error getting project");
    return res.status(500).json({ error: "Error getting project" });
  }
});

router.patch("/projects/:id", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    const body = req.body;
    const updates: any = {};
    const fields = ["title", "location", "description", "type", "status", "isPublic", "phases", "images"];
    fields.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
    if (body.roiEstimated !== undefined) updates.roiEstimated = String(body.roiEstimated);
    if (body.totalInvestment !== undefined) updates.totalInvestment = String(body.totalInvestment);
    if (body.raisedAmount !== undefined) updates.raisedAmount = String(body.raisedAmount);
    const [updated] = await db.update(projectsTable).set(updates)
      .where(and(eq(projectsTable.id, parseInt(String(req.params.id))), eq(projectsTable.userId, user.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(serializeProject(updated));
  } catch (err) {
    logger.error({ err }, "Error updating project");
    return res.status(500).json({ error: "Error updating project" });
  }
});

router.delete("/projects/:id", requireAuth(), async (req, res) => {
  try {
    const auth = (req as any).auth as any;
    const user = await getOrCreateUser(auth.userId!, `${auth.userId}@clerk.user`);
    await db.delete(projectsTable).where(
      and(eq(projectsTable.id, parseInt(String(req.params.id))), eq(projectsTable.userId, user.id))
    );
    return res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Error deleting project");
    return res.status(500).json({ error: "Error deleting project" });
  }
});

export default router;

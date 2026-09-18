import { pgTable, text, serial, timestamp, integer, numeric, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  location: text("location").notNull(),
  description: text("description"),
  type: text("type"),
  status: text("status", { enum: ["preventa", "construccion", "entrega", "completado"] }).notNull().default("preventa"),
  roiEstimated: numeric("roi_estimated", { precision: 5, scale: 2 }),
  totalInvestment: numeric("total_investment", { precision: 15, scale: 2 }),
  raisedAmount: numeric("raised_amount", { precision: 15, scale: 2 }),
  phases: jsonb("phases").$type<Array<{ name: string; progress: number; status: string }>>().notNull().default([]),
  isPublic: boolean("is_public").notNull().default(false),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  investorCount: integer("investor_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;

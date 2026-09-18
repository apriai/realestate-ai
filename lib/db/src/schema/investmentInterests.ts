import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const investmentInterestsTable = pgTable("investment_interests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  projectId: integer("project_id").notNull(),
  amountInterested: numeric("amount_interested", { precision: 15, scale: 2 }),
  message: text("message"),
  status: text("status", { enum: ["pendiente", "contactado", "rechazado"] }).notNull().default("pendiente"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvestmentInterestSchema = createInsertSchema(investmentInterestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvestmentInterest = z.infer<typeof insertInvestmentInterestSchema>;
export type InvestmentInterest = typeof investmentInterestsTable.$inferSelect;

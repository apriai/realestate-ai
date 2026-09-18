import { pgTable, text, serial, timestamp, integer, numeric, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertiesTable = pgTable("properties", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  neighborhood: text("neighborhood"),
  propertyType: text("property_type", { enum: ["casa", "depa", "local", "terreno"] }).notNull(),
  status: text("status", { enum: ["activa", "vendida", "en_rehab"] }).notNull().default("activa"),
  purchasePrice: numeric("purchase_price", { precision: 15, scale: 2 }).notNull(),
  currentValue: numeric("current_value", { precision: 15, scale: 2 }),
  rentAmount: numeric("rent_amount", { precision: 15, scale: 2 }),
  expensesMonthly: numeric("expenses_monthly", { precision: 15, scale: 2 }),
  netIncome: numeric("net_income", { precision: 15, scale: 2 }),
  occupancyRate: numeric("occupancy_rate", { precision: 5, scale: 2 }),
  nextInspectionDate: text("next_inspection_date"),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPropertySchema = createInsertSchema(propertiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof propertiesTable.$inferSelect;

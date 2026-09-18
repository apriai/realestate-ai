import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const zoneNotesTable = pgTable("zone_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  zoneId: integer("zone_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertZoneNoteSchema = createInsertSchema(zoneNotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertZoneNote = z.infer<typeof insertZoneNoteSchema>;
export type ZoneNote = typeof zoneNotesTable.$inferSelect;

import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const classesTable = pgTable("classes", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull(),
  name: text("name").notNull(),
  level: text("level").notNull(),
  section: text("section").notNull(),
  capacity: integer("capacity").notNull().default(30),
  academicYear: text("academic_year").notNull(),
});

export const insertClassSchema = createInsertSchema(classesTable).omit({ id: true });
export type InsertClass = z.infer<typeof insertClassSchema>;
export type ClassGroup = typeof classesTable.$inferSelect;
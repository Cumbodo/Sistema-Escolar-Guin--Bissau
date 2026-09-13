import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, serial, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const gradeSheetsTable = pgTable("grade_sheets", {
  id: serial("id").primaryKey(),
  classGroupId: integer("class_group_id").notNull(),
  trimester: integer("trimester").notNull(),
  subjects: text("subjects").array().notNull(),
  students: jsonb("students").$type<unknown[]>().notNull(),
});

export const insertGradeSheetSchema = createInsertSchema(gradeSheetsTable).omit({ id: true });
export type InsertGradeSheet = z.infer<typeof insertGradeSheetSchema>;
export type GradeSheetRecord = typeof gradeSheetsTable.$inferSelect;
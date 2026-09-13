import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, date, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  studentCode: text("student_code").notNull().unique(),
  name: text("name").notNull(),
  gender: text("gender").notNull(),
  birthDate: date("birth_date", { mode: "string" }),
  guardianName: text("guardian_name").notNull(),
  phone: text("phone").notNull(),
  classGroupId: integer("class_group_id").notNull(),
  enrollmentStatus: text("enrollment_status").notNull().default("active"),
  feeStatus: text("fee_status").notNull().default("pending"),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({
  id: true,
  studentCode: true,
  enrolledAt: true,
});
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
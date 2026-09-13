import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, real, serial, text, date } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const feesTable = pgTable("fees", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  amount: real("amount").notNull(),
  paidAmount: real("paid_amount").notNull().default(0),
  status: text("status").notNull().default("pending"),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  paymentDate: date("payment_date", { mode: "string" }),
  reference: text("reference").notNull(),
});

export const insertFeeSchema = createInsertSchema(feesTable).omit({ id: true });
export type InsertFee = z.infer<typeof insertFeeSchema>;
export type Fee = typeof feesTable.$inferSelect;
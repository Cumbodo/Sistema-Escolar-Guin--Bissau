import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, real, serial, text, date } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  amount: real("amount").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  paidBy: text("paid_by").notNull(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
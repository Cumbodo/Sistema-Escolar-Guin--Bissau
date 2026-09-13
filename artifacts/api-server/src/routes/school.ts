import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  classesTable,
  expensesTable,
  feesTable,
  gradeSheetsTable,
  schoolsTable,
  studentsTable,
} from "@workspace/db";
import {
  CreateClassBody,
  CreateClassResponse,
  CreateExpenseBody,
  CreateExpenseResponse,
  CreateFeeBody,
  CreateFeeResponse,
  CreateSchoolBody,
  CreateSchoolResponse,
  CreateStudentBody,
  CreateStudentResponse,
  GetClassesResponse,
  GetDashboardResponse,
  GetExpensesResponse,
  GetFeesResponse,
  GetFinanceOverviewResponse,
  GetGradeSheetForTrimesterParams,
  GetGradeSheetForTrimesterResponse,
  GetGradeSheetParams,
  GetGradeSheetResponse,
  GetSchoolsResponse,
  GetStudentsQueryParams,
  GetStudentsResponse,
  UpdateGradeSheetBody,
  UpdateGradeSheetParams,
  UpdateGradeSheetResponse,
  UpdateSchoolStatusBody,
  UpdateSchoolStatusParams,
  UpdateSchoolStatusResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const DEFAULT_SUBJECTS = [
  "Língua Portuguesa",
  "Matemática",
  "Ciências Integradas",
  "História",
  "Geografia",
  "Educação Física",
];

function isoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

async function countStudents(classGroupId?: number): Promise<number> {
  const query = classGroupId
    ? db.select({ count: sql<number>`count(*)` }).from(studentsTable).where(eq(studentsTable.classGroupId, classGroupId))
    : db.select({ count: sql<number>`count(*)` }).from(studentsTable);
  const [row] = await query;
  return Number(row?.count ?? 0);
}

async function classNameFor(classGroupId: number): Promise<{ name: string; academicYear: string } | null> {
  const [group] = await db
    .select({ name: classesTable.name, academicYear: classesTable.academicYear })
    .from(classesTable)
    .where(eq(classesTable.id, classGroupId));
  return group ?? null;
}

async function mapSchool(school: typeof schoolsTable.$inferSelect) {
  return GetSchoolsResponse.element.parse({
    ...school,
    createdAt: isoDate(school.createdAt),
    studentsCount: await countStudentsForSchool(school.id),
  });
}

async function countStudentsForSchool(schoolId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(studentsTable)
    .innerJoin(classesTable, eq(studentsTable.classGroupId, classesTable.id))
    .where(eq(classesTable.schoolId, schoolId));
  return Number(row?.count ?? 0);
}

async function mapClass(group: typeof classesTable.$inferSelect) {
  return GetClassesResponse.element.parse({
    ...group,
    enrolledCount: await countStudents(group.id),
  });
}

async function mapStudent(student: typeof studentsTable.$inferSelect) {
  const group = await classNameFor(student.classGroupId);
  return GetStudentsResponse.element.parse({
    id: student.id,
    studentCode: student.studentCode,
    name: student.name,
    gender: student.gender,
    birthDate: student.birthDate,
    guardianName: student.guardianName,
    phone: student.phone,
    classGroupId: student.classGroupId,
    className: group?.name ?? "Sem turma",
    enrollmentStatus: student.enrollmentStatus,
    feeStatus: student.feeStatus,
    enrolledAt: isoDate(student.enrolledAt),
  });
}

async function mapFee(fee: typeof feesTable.$inferSelect) {
  const [student] = await db
    .select({ name: studentsTable.name, studentCode: studentsTable.studentCode })
    .from(studentsTable)
    .where(eq(studentsTable.id, fee.studentId));
  return GetFeesResponse.element.parse({
    ...fee,
    studentName: student?.name ?? "Aluno removido",
    studentCode: student?.studentCode ?? "—",
  });
}

function scoreRow(subject: string) {
  return {
    subject,
    period1: null,
    period2: null,
    period3: null,
    coordination: null,
    average: null,
    extraordinary: null,
  };
}

async function gradeSheetFor(classGroupId: number, trimester: number) {
  const group = await classNameFor(classGroupId);
  if (!group) return null;
  const [saved] = await db
    .select()
    .from(gradeSheetsTable)
    .where(and(eq(gradeSheetsTable.classGroupId, classGroupId), eq(gradeSheetsTable.trimester, trimester)));
  const classStudents = await db
    .select({
      id: studentsTable.id,
      studentCode: studentsTable.studentCode,
      name: studentsTable.name,
    })
    .from(studentsTable)
    .where(eq(studentsTable.classGroupId, classGroupId))
    .orderBy(studentsTable.name);
  const subjects = saved?.subjects ?? DEFAULT_SUBJECTS;
  const savedStudents = Array.isArray(saved?.students) ? saved.students : [];
  const students = classStudents.map((student) => {
    const prior = savedStudents.find((item) => typeof item === "object" && item !== null && (item as { studentId?: number }).studentId === student.id) as
      | { scores?: unknown[] }
      | undefined;
    return {
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.name,
      scores: Array.isArray(prior?.scores) && prior.scores.length > 0 ? prior.scores : subjects.map(scoreRow),
    };
  });
  return GetGradeSheetResponse.parse({
    classGroupId,
    className: group.name,
    academicYear: group.academicYear,
    trimester,
    subjects,
    students,
  });
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  const [school] = await db.select().from(schoolsTable).where(eq(schoolsTable.status, "approved")).orderBy(schoolsTable.id);
  const classes = await db.select().from(classesTable);
  const students = await db.select().from(studentsTable);
  const fees = await db.select().from(feesTable);
  const expenses = await db.select().from(expensesTable);
  const [pendingSchools] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schoolsTable)
    .where(eq(schoolsTable.status, "pending"));
  const summary = GetDashboardResponse.parse({
    schoolName: school?.name ?? "Escola em configuração",
    academicYear: classes[0]?.academicYear ?? "2025/2026",
    totalStudents: students.length,
    activeStudents: students.filter((student) => student.enrollmentStatus === "active").length,
    withdrawnStudents: students.filter((student) => student.enrollmentStatus === "withdrawn").length,
    totalClasses: classes.length,
    paidFees: fees.reduce((sum, fee) => sum + fee.paidAmount, 0),
    pendingFees: fees.reduce((sum, fee) => sum + Math.max(0, fee.amount - fee.paidAmount), 0),
    totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    pendingSchools: Number(pendingSchools?.count ?? 0),
    enrollmentByClass: await Promise.all(
      classes.map(async (group) => ({
        className: group.name,
        students: await countStudents(group.id),
        capacity: group.capacity,
      })),
    ),
  });
  res.json(summary);
});

router.get("/schools", async (_req, res): Promise<void> => {
  const schools = await db.select().from(schoolsTable).orderBy(desc(schoolsTable.createdAt));
  res.json(GetSchoolsResponse.parse(await Promise.all(schools.map(mapSchool))));
});

router.post("/schools", async (req, res): Promise<void> => {
  const body = CreateSchoolBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [school] = await db.insert(schoolsTable).values(body.data).returning();
  res.status(201).json(CreateSchoolResponse.parse({ ...school, createdAt: isoDate(school.createdAt), studentsCount: 0 }));
});

router.patch("/schools/:schoolId/status", async (req, res): Promise<void> => {
  const params = UpdateSchoolStatusParams.safeParse(req.params);
  const body = UpdateSchoolStatusBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Dados de aprovação inválidos" });
    return;
  }
  const [school] = await db
    .update(schoolsTable)
    .set({ status: body.data.status })
    .where(eq(schoolsTable.id, params.data.schoolId))
    .returning();
  if (!school) {
    res.status(404).json({ error: "Escola não encontrada" });
    return;
  }
  res.json(UpdateSchoolStatusResponse.parse({ ...school, createdAt: isoDate(school.createdAt), studentsCount: await countStudentsForSchool(school.id) }));
});

router.get("/classes", async (_req, res): Promise<void> => {
  const classes = await db.select().from(classesTable).orderBy(classesTable.level, classesTable.section);
  res.json(GetClassesResponse.parse(await Promise.all(classes.map(mapClass))));
});

router.post("/classes", async (req, res): Promise<void> => {
  const body = CreateClassBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [group] = await db.insert(classesTable).values(body.data).returning();
  res.status(201).json(CreateClassResponse.parse({ ...group, enrolledCount: 0 }));
});

router.get("/students", async (req, res): Promise<void> => {
  const query = GetStudentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions = [];
  if (query.data.classGroupId !== undefined) conditions.push(eq(studentsTable.classGroupId, query.data.classGroupId));
  if (query.data.search) conditions.push(ilike(studentsTable.name, `%${query.data.search}%`));
  const students = await db
    .select()
    .from(studentsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(studentsTable.name);
  res.json(GetStudentsResponse.parse(await Promise.all(students.map(mapStudent))));
});

router.post("/students", async (req, res): Promise<void> => {
  const body = CreateStudentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [group] = await db.select().from(classesTable).where(eq(classesTable.id, body.data.classGroupId));
  if (!group) {
    res.status(400).json({ error: "A classe selecionada não existe" });
    return;
  }
  const code = `ALU-${String(Date.now()).slice(-6)}`;
  const [student] = await db.insert(studentsTable).values({ ...body.data, studentCode: code }).returning();
  res.status(201).json(CreateStudentResponse.parse(await mapStudent(student)));
});

router.get("/finance/overview", async (_req, res): Promise<void> => {
  const fees = await db.select().from(feesTable);
  const expenses = await db.select().from(expensesTable);
  const expectedFees = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const receivedFees = fees.reduce((sum, fee) => sum + fee.paidAmount, 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const monthly = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"].map((month, index) => ({
    month,
    income: index === 5 ? receivedFees : Math.round((receivedFees / 6) * (index + 1) * 100) / 100,
    expenses: index === 5 ? expenseTotal : Math.round((expenseTotal / 6) * (index + 1) * 100) / 100,
  }));
  res.json(GetFinanceOverviewResponse.parse({
    expectedFees,
    receivedFees,
    pendingFees: Math.max(0, expectedFees - receivedFees),
    expenses: expenseTotal,
    balance: receivedFees - expenseTotal,
    monthly,
  }));
});

router.get("/fees", async (_req, res): Promise<void> => {
  const fees = await db.select().from(feesTable).orderBy(desc(feesTable.dueDate));
  res.json(GetFeesResponse.parse(await Promise.all(fees.map(mapFee))));
});

router.post("/fees", async (req, res): Promise<void> => {
  const body = CreateFeeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const status = body.data.paidAmount >= body.data.amount ? "paid" : body.data.paidAmount > 0 ? "partial" : "pending";
  const [fee] = await db.insert(feesTable).values({
    ...body.data,
    status,
    paymentDate: body.data.paidAmount > 0 ? new Date().toISOString().slice(0, 10) : null,
  }).returning();
  res.status(201).json(CreateFeeResponse.parse(await mapFee(fee)));
});

router.get("/expenses", async (_req, res): Promise<void> => {
  const expenses = await db.select().from(expensesTable).orderBy(desc(expensesTable.date));
  res.json(GetExpensesResponse.parse(expenses));
});

router.post("/expenses", async (req, res): Promise<void> => {
  const body = CreateExpenseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [expense] = await db.insert(expensesTable).values(body.data).returning();
  res.status(201).json(CreateExpenseResponse.parse(expense));
});

async function gradeRoute(req: Request, res: Response, trimester: number): Promise<void> {
  const sheet = await gradeSheetFor(Number(req.params.classGroupId), trimester);
  if (!sheet) {
    res.status(404).json({ error: "Turma não encontrada" });
    return;
  }
  res.json(sheet);
}

router.get("/grade-sheets/:classGroupId", async (req, res): Promise<void> => {
  const params = GetGradeSheetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await gradeRoute(req, res, 1);
});

router.get("/grade-sheets/:classGroupId/trimester/:trimester", async (req, res): Promise<void> => {
  const params = GetGradeSheetForTrimesterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await gradeRoute(req, res, params.data.trimester);
});

router.put("/grade-sheets/:classGroupId", async (req, res): Promise<void> => {
  const params = UpdateGradeSheetParams.safeParse(req.params);
  const body = UpdateGradeSheetBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Dados da pauta inválidos" });
    return;
  }
  const existing = await db
    .select()
    .from(gradeSheetsTable)
    .where(and(eq(gradeSheetsTable.classGroupId, params.data.classGroupId), eq(gradeSheetsTable.trimester, body.data.trimester)));
  if (existing[0]) {
    await db.update(gradeSheetsTable).set({
      subjects: body.data.subjects,
      students: body.data.students,
    }).where(eq(gradeSheetsTable.id, existing[0].id));
  } else {
    await db.insert(gradeSheetsTable).values({
      classGroupId: params.data.classGroupId,
      trimester: body.data.trimester,
      subjects: body.data.subjects,
      students: body.data.students,
    });
  }
  const sheet = await gradeSheetFor(params.data.classGroupId, body.data.trimester);
  if (!sheet) {
    res.status(404).json({ error: "Turma não encontrada" });
    return;
  }
  res.json(UpdateGradeSheetResponse.parse(sheet));
});

export default router;
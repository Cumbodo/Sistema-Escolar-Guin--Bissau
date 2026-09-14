type DemoState = {
  schools: Array<Record<string, unknown>>;
  classes: Array<Record<string, unknown>>;
  students: Array<Record<string, unknown>>;
  fees: Array<Record<string, unknown>>;
  expenses: Array<Record<string, unknown>>;
  grades: Record<string, Record<string, unknown>>;
};

const storageKey = 'noskola-demo-state';
const today = new Date().toISOString();

const initialState = (): DemoState => ({
  schools: [{ id: 1, name: 'Escola Comunitária de Bissau', city: 'Bissau', contactName: 'Ana Mané', email: 'direcao@ecb.gw', phone: '+245 955 21 40', status: 'approved', studentsCount: 2, createdAt: today }],
  classes: [
    { id: 1, schoolId: 1, name: '7.º A1', level: '7.º ano', section: 'A1', capacity: 30, enrolledCount: 2, academicYear: '2025/2026' },
    { id: 2, schoolId: 1, name: '10.º A1', level: '10.º ano', section: 'A1', capacity: 28, enrolledCount: 0, academicYear: '2025/2026' },
  ],
  students: [
    { id: 1, studentCode: 'ECB-0001', name: 'Maria Djamanca', gender: 'F', birthDate: '2012-04-12', guardianName: 'Dulce Djamanca', phone: '+245 955 10 20', classGroupId: 1, className: '7.º A1', enrollmentStatus: 'active', feeStatus: 'paid', enrolledAt: today },
    { id: 2, studentCode: 'ECB-0002', name: 'Bacari Sanha', gender: 'M', birthDate: '2012-08-03', guardianName: 'Mamadou Sanha', phone: '+245 955 10 21', classGroupId: 1, className: '7.º A1', enrollmentStatus: 'active', feeStatus: 'pending', enrolledAt: today },
  ],
  fees: [{ id: 1, studentId: 1, studentName: 'Maria Djamanca', studentCode: 'ECB-0001', amount: 25000, paidAmount: 25000, status: 'paid', dueDate: '2025-10-10', paymentDate: today, reference: 'DEMO-001' }],
  expenses: [{ id: 1, description: 'Material escolar', category: 'Material escolar', amount: 45000, date: '2025-09-02', paidBy: 'Direcção' }],
  grades: {},
});

function state(): DemoState {
  if (typeof localStorage === 'undefined') return initialState();
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    const fresh = initialState();
    localStorage.setItem(storageKey, JSON.stringify(fresh));
    return fresh;
  }
  try { return JSON.parse(saved) as DemoState; } catch { return initialState(); }
}

function save(next: DemoState): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(next));
}

function bodyOf(options: RequestInit): Record<string, any> {
  return typeof options.body === 'string' ? JSON.parse(options.body) as Record<string, any> : {};
}

function gradeSheet(data: DemoState, classId: number, trimester = 1): Record<string, unknown> {
  const group = data.classes.find((item) => item.id === classId) ?? data.classes[0];
  const subjects = ['Língua Portuguesa', 'Matemática', 'História', 'Ciências'];
  const key = `${classId}-${trimester}`;
  const stored = data.grades[key];
  const students = data.students.filter((item) => item.classGroupId === classId).map((student) => ({
    studentId: student.id,
    studentCode: student.studentCode,
    studentName: student.name,
    scores: subjects.map((subject) => ({ subject, period1: null, period2: null, period3: null, coordination: null, average: null, extraordinary: null })),
  }));
  return stored ?? { classGroupId: classId, className: group?.name ?? 'Classe', academicYear: group?.academicYear ?? '2025/2026', trimester, subjects, students };
}

export function demoApi(url: string, options: RequestInit = {}): unknown {
  const parsed = new URL(url, window.location.origin);
  const path = parsed.pathname;
  const data = state();
  const method = (options.method ?? 'GET').toUpperCase();

  if (path.endsWith('/healthz')) return { status: 'ok' };
  if (path.endsWith('/dashboard')) {
    return { schoolName: data.schools[0]?.name ?? 'Escola em configuração', academicYear: '2025/2026', totalStudents: data.students.length, activeStudents: data.students.filter((item) => item.enrollmentStatus === 'active').length, withdrawnStudents: data.students.filter((item) => item.enrollmentStatus === 'withdrawn').length, totalClasses: data.classes.length, paidFees: data.fees.reduce((sum, item) => sum + Number(item.paidAmount ?? 0), 0), pendingFees: data.fees.reduce((sum, item) => sum + Math.max(0, Number(item.amount ?? 0) - Number(item.paidAmount ?? 0)), 0), totalExpenses: data.expenses.reduce((sum, item) => sum + Number(item.amount ?? 0), 0), pendingSchools: data.schools.filter((item) => item.status === 'pending').length, enrollmentByClass: data.classes.map((group) => ({ className: group.name, students: data.students.filter((item) => item.classGroupId === group.id).length, capacity: group.capacity })) };
  }
  if (path.endsWith('/schools')) {
    if (method === 'POST') { const input = bodyOf(options); const item = { ...input, id: Date.now(), status: 'pending', studentsCount: 0, createdAt: new Date().toISOString() }; data.schools.push(item); save(data); return item; }
    return data.schools;
  }
  const statusMatch = path.match(/\/schools\/(\d+)\/status$/);
  if (statusMatch && method === 'PATCH') { const item = data.schools.find((school) => school.id === Number(statusMatch[1])); Object.assign(item ?? {}, bodyOf(options)); save(data); return item; }
  if (path.endsWith('/classes')) {
    if (method === 'POST') { const input = bodyOf(options); const item = { ...input, id: Date.now(), enrolledCount: 0 }; data.classes.push(item); save(data); return item; }
    return data.classes;
  }
  if (path.endsWith('/students')) {
    if (method === 'POST') { const input = bodyOf(options); const group = data.classes.find((item) => item.id === input.classGroupId); const item = { ...input, id: Date.now(), studentCode: `ECB-${String(data.students.length + 1).padStart(4, '0')}`, className: group?.name ?? 'Classe', enrollmentStatus: 'active', enrolledAt: new Date().toISOString() }; data.students.push(item); if (group) group.enrolledCount = Number(group.enrolledCount ?? 0) + 1; save(data); return item; }
    const query = parsed.searchParams.get('search')?.toLowerCase();
    const classGroupId = parsed.searchParams.get('classGroupId');
    let result = data.students;
    if (classGroupId) result = result.filter((item) => Number(item.classGroupId) === Number(classGroupId));
    if (query) result = result.filter((item) => String(item.name).toLowerCase().includes(query) || String(item.studentCode).toLowerCase().includes(query));
    return result;
  }
  if (path.endsWith('/finance/overview')) { const expected = data.fees.reduce((sum, item) => sum + Number(item.amount ?? 0), 0); const received = data.fees.reduce((sum, item) => sum + Number(item.paidAmount ?? 0), 0); const expenses = data.expenses.reduce((sum, item) => sum + Number(item.amount ?? 0), 0); return { expectedFees: expected, receivedFees: received, pendingFees: expected - received, expenses, balance: received - expenses, monthly: [] }; }
  if (path.endsWith('/fees')) { if (method === 'POST') { const input = bodyOf(options); const student = data.students.find((item) => item.id === input.studentId); const item = { ...input, id: Date.now(), studentName: student?.name ?? 'Aluno', studentCode: student?.studentCode ?? '', status: Number(input.paidAmount) >= Number(input.amount) ? 'paid' : Number(input.paidAmount) > 0 ? 'partial' : 'pending', paymentDate: Number(input.paidAmount) > 0 ? new Date().toISOString() : null }; data.fees.push(item); save(data); return item; } return data.fees; }
  if (path.endsWith('/expenses')) { if (method === 'POST') { const item = { ...bodyOf(options), id: Date.now() }; data.expenses.push(item); save(data); return item; } return data.expenses; }
  const gradeMatch = path.match(/\/grade-sheets\/(\d+)(?:\/trimester\/(\d+))?$/);
  if (gradeMatch) { const classId = Number(gradeMatch[1]); const trimester = Number(gradeMatch[2] ?? 1); if (method === 'PUT') { const input = bodyOf(options); data.grades[`${classId}-${input.trimester}`] = { ...gradeSheet(data, classId, input.trimester), ...input }; save(data); return data.grades[`${classId}-${input.trimester}`]; } return gradeSheet(data, classId, trimester); }
  return {};
}

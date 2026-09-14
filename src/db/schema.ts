import { pgTable, text, integer, jsonb, bigint } from "drizzle-orm/pg-core";

// 1. Subscription Plans Table
export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  max_students: integer("max_students"),
  max_teachers: integer("max_teachers"),
  max_parents: integer("max_parents"),
  max_classes: integer("max_classes"),
  storage_limit_mb: integer("storage_limit_mb"),
  modules: jsonb("modules"),
  status: text("status").default("active")
});

// 2. Schools Table
export const schools = pgTable("schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  plan: text("plan"),
  status: text("status").default("active"),
  subscription: jsonb("subscription"),
  students: integer("students").default(0),
  created_at: text("created_at")
});

// 3. Users Table (Founders, Admins, Teachers, Students, Parents)
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  phone: text("phone"),
  password: text("password"),
  passwordHash: text("password_hash"),
  pin: text("pin"),
  role: text("role"), // founder_admin, school_admin, teacher, student, parent
  schoolId: text("school_id"),
  school_name: text("school_name"),
  status: text("status").default("active"),
  createdAt: bigint("created_at", { mode: "number" }),
  data: jsonb("data") // Schema-less custom properties
});

// 4. Classes Table
export const classes = pgTable("classes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  schoolId: text("school_id"),
  data: jsonb("data")
});

// 5. Sections Table
export const sections = pgTable("sections", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  classId: text("class_id"),
  schoolId: text("school_id"),
  data: jsonb("data")
});

// 6. Subjects Table
export const subjects = pgTable("subjects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  classId: text("class_id"),
  schoolId: text("school_id"),
  data: jsonb("data")
});

// 7. Attendance Table
export const attendance = pgTable("attendance", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  schoolId: text("school_id"),
  data: jsonb("data")
});

// 8. Exams Table
export const exams = pgTable("exams", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  schoolId: text("school_id"),
  data: jsonb("data")
});

// 9. Results Table
export const results = pgTable("results", {
  id: text("id").primaryKey(),
  examId: text("exam_id"),
  schoolId: text("school_id"),
  data: jsonb("data")
});

// 10. Homework Table
export const homework = pgTable("homework", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  schoolId: text("school_id"),
  data: jsonb("data")
});

// 11. Timetable Table
export const timetable = pgTable("timetable", {
  id: text("id").primaryKey(),
  schoolId: text("school_id"),
  data: jsonb("data")
});

// 12. Notices Table
export const notices = pgTable("notices", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  schoolId: text("school_id"),
  data: jsonb("data")
});

// 13. Fees Table
export const fees = pgTable("fees", {
  id: text("id").primaryKey(),
  schoolId: text("school_id"),
  data: jsonb("data")
});

// 14. Invoices Table
export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  schoolId: text("school_id"),
  data: jsonb("data")
});

// 15. Materials Table
export const materials = pgTable("materials", {
  id: text("id").primaryKey(),
  schoolId: text("school_id"),
  data: jsonb("data")
});

// 16. Audit Logs Table
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actor_id: text("actor_id"),
  actor_name: text("actor_name"),
  actor_role: text("actor_role"),
  schoolId: text("school_id"),
  action: text("action"),
  target: text("target"),
  timestamp: text("timestamp")
});

// 17. Generic Dynamic Fallback Table (for any other dynamic collections)
export const genericDocuments = pgTable("generic_documents", {
  id: text("id").primaryKey(),
  collection: text("collection").notNull(),
  schoolId: text("school_id"),
  data: jsonb("data")
});

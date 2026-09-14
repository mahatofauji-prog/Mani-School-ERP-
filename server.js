import express from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import dotenv from "dotenv";
import { db } from "./src/db/index.ts";
import { sql } from "drizzle-orm";
import * as schema from "./src/db/schema.ts";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON parse middleware with limit for payloads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Normalize request path for Vercel serverless functions if /api prefix is stripped
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith("/api")) {
    req.url = "/api" + (req.url.startsWith("/") ? "" : "/") + req.url;
  }
  next();
});

// Setup file upload configuration
const uploadsDir = process.env.VERCEL ? "/tmp/uploads" : path.join(process.cwd(), "uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn("Uploads directory notice:", err.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "_" + Math.random().toString(36).substr(2, 9) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Serve static uploaded files
app.use("/api/files", express.static(uploadsDir));

// Authentication Middleware
const JWT_SECRET = process.env.JWT_SECRET || "default_local_dev_secret_mani_school_erp_9921_abc";

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing authentication token" });

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) return res.status(403).json({ error: "Invalid or expired session token" });
    req.user = decodedUser;
    next();
  });
}

// Function to generate a random 24-character hexadecimal ID (compatible with Mongo ObjectId)
function generateId() {
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

// Global DB health checker helper
async function checkDbConnected() {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (err) {
    console.error("PostgreSQL Connection Check Failed:", err.message);
    return false;
  }
}

// Row formatter helper to merge JSONB "data" field smoothly
function formatRow(row) {
  if (!row) return null;
  const { data, ...rest } = row;
  if (data && typeof data === "object") {
    return { ...data, ...rest };
  }
  return rest;
}

// Drizzle table mapping for dynamic REST operations
const tableMap = {
  plans: schema.plans,
  schools: schema.schools,
  users: schema.users,
  classes: schema.classes,
  sections: schema.sections,
  subjects: schema.subjects,
  attendance: schema.attendance,
  exams: schema.exams,
  results: schema.results,
  homework: schema.homework,
  timetable: schema.timetable,
  notices: schema.notices,
  fees: schema.fees,
  invoices: schema.invoices,
  materials: schema.materials,
  audit_logs: schema.auditLogs
};

// Log audit helpers
async function createAuditLog(req, actorId, actorName, actorRole, schoolId, action, target) {
  try {
    const logId = generateId();
    await db.execute(sql`
      INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, school_id, action, target, timestamp)
      VALUES (${logId}, ${actorId}, ${actorName}, ${actorRole}, ${schoolId || null}, ${action}, ${target}, ${new Date().toISOString()})
    `);
  } catch (err) {
    console.error("Audit logger failure:", err);
  }
}

// API Routes

// 1. Health Status Route
app.get("/api/platform/health", async (req, res) => {
  const isConnected = await checkDbConnected();
  const collectionsStats = { schools: 0, users: 0, audit_logs: 0 };
  let errorCount = 0;

  if (isConnected) {
    try {
      const schoolsRes = await db.execute(sql`SELECT count(*)::int FROM schools`);
      const usersRes = await db.execute(sql`SELECT count(*)::int FROM users`);
      const logsRes = await db.execute(sql`SELECT count(*)::int FROM audit_logs`);
      collectionsStats.schools = schoolsRes.rows[0]?.count || 0;
      collectionsStats.users = usersRes.rows[0]?.count || 0;
      collectionsStats.audit_logs = logsRes.rows[0]?.count || 0;
    } catch (e) {
      console.error("Health counts failed:", e.message);
      errorCount = 1;
    }
  }

  res.json({
    checked_at: new Date().toISOString(),
    database: isConnected ? "operational" : "degraded",
    authentication: "operational",
    storage: "operational",
    api: "operational",
    collections: collectionsStats,
    error_count: errorCount
  });
});

// 2. Auth Login and Verification
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const emailLower = email.toLowerCase().trim();
    const userRes = await db.execute(sql`SELECT * FROM users WHERE email = ${emailLower}`);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = formatRow(userRes.rows[0]);

    if (user.status === "archived" || user.status === "inactive") {
      return res.status(403).json({ error: "Your account is inactive or archived. Please contact your admin." });
    }

    let isValid = false;
    if (user.password_hash) {
      isValid = await bcrypt.compare(password, user.password_hash);
    } else {
      // Fallback plain string check
      isValid = (user.password === password) || (user.pin === password);
    }

    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Build user payload
    const tokenPayload = {
      id: user.id,
      uid: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      schoolId: user.school_id || null,
      school_name: user.school_name || null
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, ...tokenPayload });

    createAuditLog(req, user.id, user.name, user.role, user.school_id, "login", "Success").catch(() => {});
  } catch (err) {
    console.error("Login failure:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server authentication failure" });
    }
  }
});

// Auth Pin Login (for quick student/parent PIN logging)
app.post("/api/auth/pin-login", async (req, res) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) {
      return res.status(400).json({ error: "Email and PIN are required" });
    }

    const emailLower = email.toLowerCase().trim();
    const userRes = await db.execute(sql`SELECT * FROM users WHERE email = ${emailLower}`);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or PIN" });
    }

    const user = formatRow(userRes.rows[0]);

    let isValid = false;
    if (user.password_hash) {
      isValid = await bcrypt.compare(pin, user.password_hash);
    } else {
      isValid = (user.pin === pin) || (user.password === pin);
    }

    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or PIN" });
    }

    const tokenPayload = {
      id: user.id,
      uid: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      schoolId: user.school_id || null,
      school_name: user.school_name || null
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, ...tokenPayload });

    createAuditLog(req, user.id, user.name, user.role, user.school_id, "pin_login", "Success").catch(() => {});
  } catch (err) {
    console.error("PIN login failure:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server PIN authentication failure" });
    }
  }
});

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const userRes = await db.execute(sql`SELECT * FROM users WHERE id = ${req.user.id}`);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const user = formatRow(userRes.rows[0]);

    res.json({
      uid: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone || "",
      schoolId: user.school_id || null,
      school_name: user.school_name || null,
      status: user.status || "active"
    });
  } catch (err) {
    console.error("Fetch profile failed:", err);
    res.status(500).json({ error: "Failed to load authenticated user profile" });
  }
});

// 3. File Uploads Router
app.post("/api/upload", authenticateToken, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file was attached" });
  }
  res.json({
    path: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

// 4. Dashboard Summary Counter Endpoint
app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userSchoolId = req.user.schoolId;
    const range = req.query.range || "month";

    // 1. Schools counts & breakdown
    let allSchools = [];
    try {
      const schoolsRes = await db.execute(sql`SELECT * FROM schools`);
      allSchools = (schoolsRes.rows || []).map(formatRow);
    } catch (e) {
      console.error("Failed to query schools:", e.message);
    }

    const total_schools = allSchools.length;
    const active_schools = allSchools.filter((s) => (s.status || "active").toLowerCase() === "active").length;
    const suspended_schools = allSchools.filter((s) => (s.status || "").toLowerCase() === "suspended").length;
    const inactive_schools = allSchools.filter((s) => (s.status || "").toLowerCase() === "inactive").length;
    const trial_schools = allSchools.filter((s) => (s.status || "").toLowerCase() === "trial" || (s.plan || "").toLowerCase() === "trial").length;

    const now = new Date();
    const new_schools = allSchools.filter((s) => {
      if (!s.created_at) return false;
      const created = new Date(s.created_at);
      if (isNaN(created.getTime())) return false;
      if (range === "today") return created.toDateString() === now.toDateString();
      if (range === "week") return now.getTime() - created.getTime() <= 7 * 24 * 60 * 60 * 1000;
      if (range === "month") return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      if (range === "year") return created.getFullYear() === now.getFullYear();
      return true;
    }).length;

    const status_breakdown = {
      Active: active_schools,
      Trial: trial_schools,
      Suspended: suspended_schools,
      Inactive: inactive_schools,
    };

    // 2. Users count
    let allUsers = [];
    try {
      const usersRes = await db.execute(sql`SELECT * FROM users`);
      allUsers = (usersRes.rows || []).map(formatRow);
    } catch (e) {
      console.error("Failed to query users:", e.message);
    }

    const schoolFilter = (u) => !userSchoolId || userRole === "founder_admin" || u.schoolId === userSchoolId || u.school_id === userSchoolId;
    const filteredUsers = allUsers.filter(schoolFilter);

    const total_students = filteredUsers.filter((u) => u.role === "student").length;
    const total_teachers = filteredUsers.filter((u) => u.role === "teacher").length;
    const total_parents = filteredUsers.filter((u) => u.role === "parent").length;
    const total_school_admins = filteredUsers.filter((u) => u.role === "school_admin" || u.role === "principal" || u.role === "admin").length;

    // 3. Classes, Sections, Subjects, Notices, Homework, Materials
    let classesCount = 0;
    let sectionsCount = 0;
    let subjectsCount = 0;
    let noticesCount = 0;
    let homeworkCount = 0;
    let materialsCount = 0;
    let videosCount = 0;
    let recentHomework = [];

    try {
      const clsRes = await db.execute(sql`SELECT count(*)::int FROM classes ${userSchoolId && userRole !== "founder_admin" ? sql`WHERE school_id = ${userSchoolId}` : sql``}`);
      classesCount = clsRes.rows[0]?.count || 0;
    } catch (e) {}

    try {
      const secRes = await db.execute(sql`SELECT count(*)::int FROM sections ${userSchoolId && userRole !== "founder_admin" ? sql`WHERE school_id = ${userSchoolId}` : sql``}`);
      sectionsCount = secRes.rows[0]?.count || 0;
    } catch (e) {}

    try {
      const subRes = await db.execute(sql`SELECT count(*)::int FROM subjects ${userSchoolId && userRole !== "founder_admin" ? sql`WHERE school_id = ${userSchoolId}` : sql``}`);
      subjectsCount = subRes.rows[0]?.count || 0;
    } catch (e) {}

    try {
      const notRes = await db.execute(sql`SELECT count(*)::int FROM notices ${userSchoolId && userRole !== "founder_admin" ? sql`WHERE school_id = ${userSchoolId}` : sql``}`);
      noticesCount = notRes.rows[0]?.count || 0;
    } catch (e) {}

    try {
      const hwRes = await db.execute(sql`SELECT * FROM homework ${userSchoolId && userRole !== "founder_admin" ? sql`WHERE school_id = ${userSchoolId}` : sql``} ORDER BY id DESC LIMIT 5`);
      const hws = (hwRes.rows || []).map(formatRow);
      homeworkCount = hws.length;
      recentHomework = hws;
    } catch (e) {}

    try {
      const matRes = await db.execute(sql`SELECT count(*)::int FROM materials ${userSchoolId && userRole !== "founder_admin" ? sql`WHERE school_id = ${userSchoolId}` : sql``}`);
      materialsCount = matRes.rows[0]?.count || 0;
    } catch (e) {}

    // Top schools by student count
    const schoolStudentMap = {};
    allUsers.filter((u) => u.role === "student").forEach((u) => {
      const sId = u.schoolId || u.school_id;
      if (sId) {
        schoolStudentMap[sId] = (schoolStudentMap[sId] || 0) + 1;
      }
    });

    const top_schools = allSchools
      .map((s) => ({
        name: s.name,
        students: schoolStudentMap[s.id] || s.students || 0,
      }))
      .sort((a, b) => b.students - a.students)
      .slice(0, 5);

    const recently_created = allSchools
      .slice()
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);

    // Recent audit activity logs
    let recent_activity = [];
    try {
      const logRes = await db.execute(sql`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 5`);
      recent_activity = (logRes.rows || []).map(formatRow);
    } catch (e) {}

    res.json({
      // Aggregates for Founder & Admin
      total_schools,
      active_schools,
      suspended_schools,
      inactive_schools,
      trial_schools,
      new_schools,
      total_school_admins,
      total_parents,
      total_students,
      total_teachers,
      total_classes: classesCount,
      total_sections: sectionsCount,
      total_subjects: subjectsCount,
      status_breakdown,
      top_schools,
      recently_created,
      recent_activity,

      // Teacher / Classroom stats
      my_classes: classesCount,
      my_students: total_students,
      my_subjects: subjectsCount,
      my_homework: homeworkCount,
      my_materials: materialsCount,
      my_videos: videosCount,
      subjects: ["Mathematics", "Science", "English", "Social Studies"],
      recent_homework: recentHomework,

      // Student / Parent stats
      attendance_pct: 95,
      attendance_present: 38,
      attendance_total: 40,
      children: total_students > 0 ? 1 : 0,

      // Legacy fallback fields
      schools: total_schools,
      students: total_students,
      teachers: total_teachers,
      classes: classesCount,
      sections: sectionsCount,
      notices: noticesCount,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("Dashboard stats aggregator failed:", err);
    res.status(500).json({ error: "Failed to assemble dashboard analytics" });
  }
});

// 5. Special route to load current logged-in user's school profile
app.get("/api/my-school", authenticateToken, async (req, res) => {
  try {
    if (!req.user.schoolId) {
      return res.status(400).json({ error: "Your profile is not associated with any school" });
    }
    const schoolId = req.user.schoolId;
    const schoolRes = await db.execute(sql`SELECT * FROM schools WHERE id = ${schoolId}`);
    if (schoolRes.rows.length === 0) {
      return res.status(404).json({ error: "School profile not found" });
    }
    const school = formatRow(schoolRes.rows[0]);
    res.json(school);
  } catch (err) {
    console.error("Get my-school failed:", err);
    res.status(500).json({ error: "Failed to retrieve school profile" });
  }
});

app.put("/api/my-school", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "school_admin" && req.user.role !== "founder_admin" && req.user.role !== "principal") {
      return res.status(403).json({ error: "Unauthorized operation" });
    }
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return res.status(400).json({ error: "Missing school scope" });
    }

    const { id, _id, ...updatePayload } = req.body;
    
    // Split payload
    const tableColumns = Object.keys(schema.schools);
    const standardFields = {};
    const extraFields = {};

    Object.keys(updatePayload).forEach(key => {
      if (tableColumns.includes(key)) {
        standardFields[key] = updatePayload[key];
      } else {
        extraFields[key] = updatePayload[key];
      }
    });

    const updates = [];
    const values = [];
    Object.keys(standardFields).forEach((key, i) => {
      updates.push(`${key} = $${i + 1}`);
      values.push(standardFields[key]);
    });

    values.push(schoolId);
    const query = `UPDATE schools SET ${updates.join(", ")} WHERE id = $${values.length}`;
    await db.execute({ sql: query, params: values });

    res.json({ id: schoolId, ...updatePayload });
    await createAuditLog(req, req.user.id, req.user.name, req.user.role, schoolId, "update_school_profile", "Success");
  } catch (err) {
    console.error("Update my-school failed:", err);
    res.status(500).json({ error: "Failed to update school profile" });
  }
});

// 6. Special Admin management routes under Schools Details page
app.post("/api/schools/:schoolId/admins", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "founder_admin") {
      return res.status(403).json({ error: "Access denied. Founder Admin authorization required." });
    }
    const { schoolId } = req.params;
    const { name, email, phone, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const emailLower = email.toLowerCase().trim();
    const existingRes = await db.execute(sql`SELECT id FROM users WHERE email = ${emailLower}`);
    if (existingRes.rows.length > 0) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const schoolRes = await db.execute(sql`SELECT name FROM schools WHERE id = ${schoolId}`);
    const schoolName = schoolRes.rows[0]?.name || "Platform";

    const newAdminId = generateId();
    await db.execute(sql`
      INSERT INTO users (id, name, email, phone, password, password_hash, role, school_id, school_name, status, created_at, data)
      VALUES (
        ${newAdminId},
        ${name || "School Admin"},
        ${emailLower},
        ${phone || ""},
        ${password},
        ${passwordHash},
        'school_admin',
        ${schoolId},
        ${schoolName},
        'active',
        ${Date.now()},
        '{}'::jsonb
      )
    `);

    res.json({ id: newAdminId, name, email: emailLower, phone, role: "school_admin", schoolId, school_name: schoolName, status: "active" });

    await createAuditLog(req, req.user.id, req.user.name, req.user.role, schoolId, "create_school_admin", emailLower);
  } catch (err) {
    console.error("Create admin failed:", err);
    res.status(500).json({ error: "Failed to save administrator record" });
  }
});

// User Custom Reset Password route
app.post("/api/users/:userId/reset-password", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const targetUserRes = await db.execute(sql`SELECT * FROM users WHERE id = ${userId}`);
    if (targetUserRes.rows.length === 0) {
      return res.status(404).json({ error: "User record not found" });
    }

    const targetUser = formatRow(targetUserRes.rows[0]);

    // Role-based authorization boundary
    if (req.user.role !== "founder_admin") {
      if (req.user.role !== "school_admin" && req.user.role !== "principal") {
        return res.status(403).json({ error: "Access denied." });
      }
      if (targetUser.school_id !== req.user.schoolId) {
        return res.status(403).json({ error: "Unauthorized access to another school's records." });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.execute(sql`UPDATE users SET password_hash = ${passwordHash}, password = ${password} WHERE id = ${userId}`);

    res.json({ success: true, message: "Password reset complete" });
    await createAuditLog(req, req.user.id, req.user.name, req.user.role, targetUser.school_id, "reset_password", targetUser.email);
  } catch (err) {
    console.error("Reset password failed:", err);
    res.status(500).json({ error: "Failed to complete password reset" });
  }
});

// Quick status patching for Users
app.patch("/api/users/:userId/status", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status value is required" });

    const targetUserRes = await db.execute(sql`SELECT * FROM users WHERE id = ${userId}`);
    if (targetUserRes.rows.length === 0) return res.status(404).json({ error: "User profile not found" });

    const targetUser = formatRow(targetUserRes.rows[0]);

    if (req.user.role !== "founder_admin" && targetUser.school_id !== req.user.schoolId) {
      return res.status(403).json({ error: "Unauthorized scope" });
    }

    await db.execute(sql`UPDATE users SET status = ${status} WHERE id = ${userId}`);
    res.json({ id: userId, status });

    await createAuditLog(req, req.user.id, req.user.name, req.user.role, targetUser.school_id, "update_user_status", `${targetUser.email} to ${status}`);
  } catch (err) {
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// Quick status patching for Schools
app.patch("/api/schools/:schoolId/status", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "founder_admin") return res.status(403).json({ error: "Unauthorized" });
    const { schoolId } = req.params;
    const { status } = req.body;

    await db.execute(sql`UPDATE schools SET status = ${status} WHERE id = ${schoolId}`);
    res.json({ id: schoolId, status });

    await createAuditLog(req, req.user.id, req.user.name, req.user.role, schoolId, "update_school_status", status);
  } catch (err) {
    res.status(500).json({ error: "Failed to update school status" });
  }
});

// Special specific school retrieval
app.get("/api/schools/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const schoolRes = await db.execute(sql`SELECT * FROM schools WHERE id = ${id}`);
    if (schoolRes.rows.length === 0) return res.status(404).json({ error: "School profile not found" });
    const school = formatRow(schoolRes.rows[0]);
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: "Failed to load school profile" });
  }
});

// Specific route to query users list by role
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    const { role } = req.query;
    const conditions = [];

    if (role) {
      conditions.push(sql`role = ${role}`);
    }

    // Scope rules: non-founders are strictly scoped to their own school
    if (req.user.role !== "founder_admin") {
      if (!req.user.schoolId) {
        return res.json([]);
      }
      conditions.push(sql`school_id = ${req.user.schoolId}`);
    }

    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
    const usersRes = await db.execute(sql`SELECT * FROM users ${whereClause} ORDER BY name ASC`);
    const list = usersRes.rows.map(formatRow);
    res.json(list.map(u => ({ ...u, password_hash: undefined, passwordHash: undefined })));
  } catch (err) {
    console.error("List users failed:", err);
    res.status(500).json({ error: "Failed to search users" });
  }
});

// Schools endpoints
app.get("/api/schools", authenticateToken, async (req, res) => {
  try {
    const schoolsRes = await db.execute(sql`SELECT * FROM schools ORDER BY name ASC`);
    const list = schoolsRes.rows.map(formatRow);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to load schools list" });
  }
});

app.post("/api/schools", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "founder_admin") {
      return res.status(403).json({ error: "Unauthorized access" });
    }
    const { admin, ...schoolData } = req.body;
    schoolData.created_at = schoolData.created_at || new Date().toISOString();
    schoolData.students = schoolData.students || 0;
    if (!schoolData.subscription && schoolData.plan) {
      schoolData.subscription = { plan: schoolData.plan };
    }

    const schoolId = generateId();
    
    // Save school profile
    await db.execute(sql`
      INSERT INTO schools (id, name, address, phone, email, plan, status, subscription, students, created_at)
      VALUES (
        ${schoolId},
        ${schoolData.name},
        ${schoolData.address || ""},
        ${schoolData.phone || ""},
        ${schoolData.email || ""},
        ${schoolData.plan || ""},
        ${schoolData.status || "active"},
        ${JSON.stringify(schoolData.subscription)},
        ${schoolData.students},
        ${schoolData.created_at}
      )
    `);

    if (admin && admin.email) {
      try {
        const passwordHash = admin.password ? await bcrypt.hash(admin.password, 10) : await bcrypt.hash("admin123", 10);
        const adminUserId = generateId();
        await db.execute(sql`
          INSERT INTO users (id, name, email, phone, password, password_hash, role, school_id, school_name, status, created_at, data)
          VALUES (
            ${adminUserId},
            ${admin.name || "School Admin"},
            ${admin.email.toLowerCase().trim()},
            ${admin.phone || ""},
            ${admin.password || "admin123"},
            ${passwordHash},
            'school_admin',
            ${schoolId},
            ${schoolData.name},
            'active',
            ${Date.now()},
            '{}'::jsonb
          )
        `);
      } catch (authErr) {
        console.error("Create admin failure inside school creation:", authErr);
      }
    }

    res.json({ id: schoolId, ...schoolData });
    await createAuditLog(req, req.user.id, req.user.name, req.user.role, schoolId, "create_school", schoolData.name);
  } catch (err) {
    console.error("Create school failed:", err);
    res.status(500).json({ error: "Failed to create school profile" });
  }
});

// Plans endpoints
app.get("/api/plans", authenticateToken, async (req, res) => {
  try {
    const plansRes = await db.execute(sql`SELECT * FROM plans`);
    const list = plansRes.rows.map(formatRow);
    if (list.length === 0) {
      return res.json([
        { id: "plan_free", name: "Free", max_students: 50, max_teachers: 5, max_parents: 50, max_classes: 5, storage_limit_mb: 100, modules: ["dashboard", "students", "teachers", "attendance"], status: "active" },
        { id: "plan_standard", name: "Standard", max_students: 500, max_teachers: 30, max_parents: 500, max_classes: 25, storage_limit_mb: 2000, modules: ["dashboard", "students", "teachers", "attendance", "exams", "fees", "notices"], status: "active" },
        { id: "plan_premium", name: "Premium", max_students: 2000, max_teachers: 100, max_parents: 2000, max_classes: 60, storage_limit_mb: 10000, modules: ["dashboard", "students", "teachers", "attendance", "exams", "results", "homework", "timetable", "notices", "fees", "reports"], status: "active" }
      ]);
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to search subscription plans" });
  }
});

// School Subscription Patch
app.patch("/api/schools/:schoolId/subscription", authenticateToken, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const subscription = req.body;
    const schoolRes = await db.execute(sql`SELECT * FROM schools WHERE id = ${schoolId}`);
    if (schoolRes.rows.length === 0) return res.status(404).json({ error: "School not found" });

    await db.execute(sql`
      UPDATE schools
      SET plan = ${subscription.plan || "Free"},
          subscription = ${JSON.stringify(subscription)}
      WHERE id = ${schoolId}
    `);
    res.json({ id: schoolId, subscription });
  } catch (err) {
    res.status(500).json({ error: "Failed to update subscription" });
  }
});

// Classroom Endpoints
app.get("/api/classroom/my-classes", authenticateToken, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const classesRes = await db.execute(sql`SELECT * FROM classes ${schoolId && req.user.role !== "founder_admin" ? sql`WHERE school_id = ${schoolId}` : sql``}`);
    const sectionsRes = await db.execute(sql`SELECT * FROM sections ${schoolId && req.user.role !== "founder_admin" ? sql`WHERE school_id = ${schoolId}` : sql``}`);
    const subjectsRes = await db.execute(sql`SELECT * FROM subjects ${schoolId && req.user.role !== "founder_admin" ? sql`WHERE school_id = ${schoolId}` : sql``}`);
    const studentsRes = await db.execute(sql`SELECT * FROM users WHERE role = 'student' ${schoolId && req.user.role !== "founder_admin" ? sql`AND school_id = ${schoolId}` : sql``}`);

    const classesList = classesRes.rows.map(formatRow);
    const sectionsList = sectionsRes.rows.map(formatRow);
    const subjectsList = subjectsRes.rows.map(formatRow);
    const studentsList = studentsRes.rows.map(formatRow);

    const formattedClasses = classesList.map(c => {
      const classSections = sectionsList.filter(s => s.class_id === c.id);
      const studentCount = studentsList.filter(s => s.class_id === c.id).length;
      return {
        class_id: c.id,
        class_name: c.name,
        sections: classSections,
        students: studentCount,
      };
    });

    res.json({
      classes: formattedClasses,
      subjects: subjectsList.map(s => s.name),
    });
  } catch (err) {
    console.error("my-classes failed:", err);
    res.status(500).json({ error: "Failed to load classes" });
  }
});

app.get("/api/classroom/homework", authenticateToken, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { student_id } = req.query;
    let whereClause = schoolId && req.user.role !== "founder_admin" ? sql`WHERE school_id = ${schoolId}` : sql``;

    if (student_id) {
      const studentRes = await db.execute(sql`SELECT class_id FROM users WHERE id = ${student_id}`);
      if (studentRes.rows.length > 0 && studentRes.rows[0].class_id) {
        const cId = studentRes.rows[0].class_id;
        whereClause = sql`WHERE class_id = ${cId}`;
      }
    }

    const hwRes = await db.execute(sql`SELECT * FROM homework ${whereClause} ORDER BY id DESC`);
    res.json(hwRes.rows.map(formatRow));
  } catch (err) {
    console.error("Get classroom homework failed:", err);
    res.status(500).json({ error: "Failed to fetch homework" });
  }
});

app.post("/api/classroom/homework", authenticateToken, async (req, res) => {
  try {
    const payload = req.body;
    const newId = generateId();
    const schoolId = req.user.schoolId || payload.schoolId || payload.school_id;
    const teacherId = req.user.id;
    const teacherName = req.user.name;

    await db.execute(sql`
      INSERT INTO homework (id, school_id, class_id, section_id, teacher_id, teacher_name, subject, title, description, instructions, due_date, priority, attachment_path, created_at, data)
      VALUES (
        ${newId},
        ${schoolId || null},
        ${payload.class_id || null},
        ${payload.section_id || null},
        ${teacherId},
        ${teacherName},
        ${payload.subject || ""},
        ${payload.title},
        ${payload.description || ""},
        ${payload.instructions || ""},
        ${payload.due_date || ""},
        ${payload.priority || "normal"},
        ${payload.attachment_path || ""},
        ${Date.now()},
        '{}'::jsonb
      )
    `);

    res.json({ id: newId, teacher_id: teacherId, teacher_name: teacherName, school_id: schoolId, ...payload });
  } catch (err) {
    console.error("Create classroom homework failed:", err);
    res.status(500).json({ error: "Failed to post homework" });
  }
});

app.delete("/api/classroom/homework/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(sql`DELETE FROM homework WHERE id = ${id}`);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete homework" });
  }
});

app.get("/api/classroom/materials", authenticateToken, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const whereClause = schoolId && req.user.role !== "founder_admin" ? sql`WHERE school_id = ${schoolId}` : sql``;
    const matRes = await db.execute(sql`SELECT * FROM materials ${whereClause} ORDER BY id DESC`);
    res.json(matRes.rows.map(formatRow));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch materials" });
  }
});

app.post("/api/classroom/materials", authenticateToken, async (req, res) => {
  try {
    const payload = req.body;
    const newId = generateId();
    const schoolId = req.user.schoolId || payload.schoolId || payload.school_id;
    const teacherId = req.user.id;
    const teacherName = req.user.name;

    await db.execute(sql`
      INSERT INTO materials (id, school_id, class_id, teacher_id, teacher_name, subject, chapter, title, type, file_path, created_at, data)
      VALUES (
        ${newId},
        ${schoolId || null},
        ${payload.class_id || null},
        ${teacherId},
        ${teacherName},
        ${payload.subject || ""},
        ${payload.chapter || ""},
        ${payload.title},
        ${payload.type || "note"},
        ${payload.file_path || ""},
        ${Date.now()},
        '{}'::jsonb
      )
    `);

    res.json({ id: newId, teacher_id: teacherId, teacher_name: teacherName, school_id: schoolId, ...payload });
  } catch (err) {
    console.error("Create materials failed:", err);
    res.status(500).json({ error: "Failed to publish material" });
  }
});

app.delete("/api/classroom/materials/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(sql`DELETE FROM materials WHERE id = ${id}`);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete material" });
  }
});

app.get("/api/classroom/videos", authenticateToken, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const conditions = [sql`collection = 'videos'`];
    if (schoolId && req.user.role !== "founder_admin") {
      conditions.push(sql`school_id = ${schoolId}`);
    }
    const query = sql`SELECT * FROM generic_documents WHERE ${sql.join(conditions, sql` AND `)}`;
    const resQuery = await db.execute(query);
    res.json(resQuery.rows.map(formatRow));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

app.post("/api/classroom/videos", authenticateToken, async (req, res) => {
  try {
    const payload = req.body;
    const newId = generateId();
    const schoolId = req.user.schoolId || payload.schoolId || payload.school_id;
    payload.id = newId;

    await db.execute(sql`
      INSERT INTO generic_documents (id, collection, school_id, data)
      VALUES (${newId}, 'videos', ${schoolId || null}, ${JSON.stringify(payload)})
    `);

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: "Failed to save video" });
  }
});

app.delete("/api/classroom/videos/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(sql`DELETE FROM generic_documents WHERE id = ${id} AND collection = 'videos'`);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete video" });
  }
});

// Payments & Invoices Endpoints
app.get("/api/payments/invoices", authenticateToken, async (req, res) => {
  try {
    const userSchoolId = req.user.schoolId;
    let query = sql`SELECT * FROM invoices ORDER BY id DESC`;
    if (req.user.role !== "founder_admin" && userSchoolId) {
      query = sql`SELECT * FROM invoices WHERE school_id = ${userSchoolId} ORDER BY id DESC`;
    }
    const invRes = await db.execute(query);
    const invoices = invRes.rows.map(formatRow);

    let paymentDetails = {};
    const setRes = await db.execute(sql`SELECT * FROM generic_documents WHERE collection = 'platform_settings' AND id = 'founder_payment_details'`);
    if (setRes.rows.length > 0) {
      paymentDetails = formatRow(setRes.rows[0]);
    }

    res.json({ invoices, payment_details: paymentDetails });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

app.post("/api/payments/invoices", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "founder_admin") return res.status(403).json({ error: "Unauthorized" });
    const payload = req.body;
    const newId = generateId();
    const invNum = `INV-${Date.now().toString().slice(-6)}`;

    await db.execute(sql`
      INSERT INTO invoices (id, school_id, invoice_number, description, amount, status, due_date, data)
      VALUES (
        ${newId},
        ${payload.school_id},
        ${invNum},
        ${payload.description || ""},
        ${payload.amount},
        'issued',
        ${payload.due_date || ""},
        '{}'::jsonb
      )
    `);

    res.json({ id: newId, school_id: payload.school_id, invoice_number: invNum, description: payload.description, amount: payload.amount, status: "issued", due_date: payload.due_date });
  } catch (err) {
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

app.post("/api/payments/invoices/:id/submit", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const submission = req.body;
    const invRes = await db.execute(sql`SELECT * FROM invoices WHERE id = ${id}`);
    if (invRes.rows.length === 0) return res.status(404).json({ error: "Invoice not found" });

    const inv = formatRow(invRes.rows[0]);
    const updatedData = { ...inv.data, submission };

    await db.execute(sql`
      UPDATE invoices
      SET status = 'payment_submitted',
          data = ${JSON.stringify(updatedData)}
      WHERE id = ${id}
    `);

    res.json({ id, status: "payment_submitted", submission });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit payment proof" });
  }
});

app.post("/api/payments/invoices/:id/verify", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "founder_admin") return res.status(403).json({ error: "Unauthorized" });
    const { id } = req.params;
    const { action, reason } = req.body;

    const invRes = await db.execute(sql`SELECT * FROM invoices WHERE id = ${id}`);
    if (invRes.rows.length === 0) return res.status(404).json({ error: "Invoice not found" });

    const inv = formatRow(invRes.rows[0]);
    const newStatus = action === "approve" ? "paid" : "issued";
    const updatedData = {
      ...inv.data,
      verification: { action, reason, verified_at: Date.now() },
      submission: inv.data?.submission ? { ...inv.data.submission, status: action === "approve" ? "approved" : "rejected" } : undefined
    };

    await db.execute(sql`
      UPDATE invoices
      SET status = ${newStatus},
          data = ${JSON.stringify(updatedData)}
      WHERE id = ${id}
    `);

    res.json({ id, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

app.get("/api/payments/founder-settings", authenticateToken, async (req, res) => {
  try {
    const resDoc = await db.execute(sql`SELECT * FROM generic_documents WHERE collection = 'platform_settings' AND id = 'founder_payment_details'`);
    if (resDoc.rows.length === 0) return res.json({});
    res.json(formatRow(resDoc.rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to get founder payment settings" });
  }
});

app.put("/api/payments/founder-settings", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "founder_admin") return res.status(403).json({ error: "Unauthorized" });
    const payload = req.body;
    const existing = await db.execute(sql`SELECT * FROM generic_documents WHERE collection = 'platform_settings' AND id = 'founder_payment_details'`);
    if (existing.rows.length > 0) {
      await db.execute(sql`UPDATE generic_documents SET data = ${JSON.stringify(payload)} WHERE collection = 'platform_settings' AND id = 'founder_payment_details'`);
    } else {
      await db.execute(sql`INSERT INTO generic_documents (id, collection, data) VALUES ('founder_payment_details', 'platform_settings', ${JSON.stringify(payload)})`);
    }
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: "Failed to save payment settings" });
  }
});

// Platform Settings Endpoints
app.get("/api/platform/settings", authenticateToken, async (req, res) => {
  try {
    const resDoc = await db.execute(sql`SELECT * FROM generic_documents WHERE collection = 'platform_settings' AND id = 'global_config'`);
    if (resDoc.rows.length === 0) {
      return res.json({ platform_name: "MANI ERP", support_email: "support@manierp.com", maintenance_mode: false });
    }
    res.json(formatRow(resDoc.rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to get platform settings" });
  }
});

app.put("/api/platform/settings", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "founder_admin") return res.status(403).json({ error: "Unauthorized" });
    const payload = req.body;
    const existing = await db.execute(sql`SELECT * FROM generic_documents WHERE collection = 'platform_settings' AND id = 'global_config'`);
    if (existing.rows.length > 0) {
      await db.execute(sql`UPDATE generic_documents SET data = ${JSON.stringify(payload)} WHERE collection = 'platform_settings' AND id = 'global_config'`);
    } else {
      await db.execute(sql`INSERT INTO generic_documents (id, collection, data) VALUES ('global_config', 'platform_settings', ${JSON.stringify(payload)})`);
    }
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: "Failed to save platform settings" });
  }
});

// Biometric Endpoints
app.get("/api/biometric/status", authenticateToken, async (req, res) => {
  res.json({ enabled: true, connected_devices: 2, last_sync: new Date().toISOString() });
});

app.get("/api/biometric/devices", authenticateToken, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const conditions = [sql`collection = 'biometric_devices'`];
    if (schoolId && req.user.role !== "founder_admin") conditions.push(sql`school_id = ${schoolId}`);
    const resQuery = await db.execute(sql`SELECT * FROM generic_documents WHERE ${sql.join(conditions, sql` AND `)}`);
    res.json(resQuery.rows.map(formatRow));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch biometric devices" });
  }
});

app.post("/api/biometric/devices", authenticateToken, async (req, res) => {
  try {
    const payload = req.body;
    const newId = generateId();
    const schoolId = req.user.schoolId || payload.schoolId;
    payload.id = newId;
    payload.status = payload.status || "online";
    await db.execute(sql`INSERT INTO generic_documents (id, collection, school_id, data) VALUES (${newId}, 'biometric_devices', ${schoolId || null}, ${JSON.stringify(payload)})`);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: "Failed to create biometric device" });
  }
});

app.patch("/api/biometric/devices/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const docRes = await db.execute(sql`SELECT * FROM generic_documents WHERE id = ${id}`);
    if (docRes.rows.length === 0) return res.status(404).json({ error: "Device not found" });
    const doc = formatRow(docRes.rows[0]);
    doc.status = status;
    await db.execute(sql`UPDATE generic_documents SET data = ${JSON.stringify(doc)} WHERE id = ${id}`);
    res.json({ id, status });
  } catch (err) {
    res.status(500).json({ error: "Failed to update device status" });
  }
});

app.delete("/api/biometric/devices/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(sql`DELETE FROM generic_documents WHERE id = ${id} AND collection = 'biometric_devices'`);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete device" });
  }
});

app.get("/api/biometric/enrollments", authenticateToken, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const conditions = [sql`collection = 'biometric_enrollments'`];
    if (schoolId && req.user.role !== "founder_admin") conditions.push(sql`school_id = ${schoolId}`);
    const resQuery = await db.execute(sql`SELECT * FROM generic_documents WHERE ${sql.join(conditions, sql` AND `)}`);
    res.json(resQuery.rows.map(formatRow));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch biometric enrollments" });
  }
});

app.post("/api/biometric/enroll", authenticateToken, async (req, res) => {
  try {
    const { student_id } = req.body;
    const newId = generateId();
    const schoolId = req.user.schoolId;
    const payload = { id: newId, student_id, enrolled_at: Date.now(), status: "active" };
    await db.execute(sql`INSERT INTO generic_documents (id, collection, school_id, data) VALUES (${newId}, 'biometric_enrollments', ${schoolId || null}, ${JSON.stringify(payload)})`);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: "Failed to enroll student" });
  }
});

app.delete("/api/biometric/enroll/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(sql`DELETE FROM generic_documents WHERE id = ${id} AND collection = 'biometric_enrollments'`);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "Failed to unenroll student" });
  }
});

// Announcements Endpoints
app.get("/api/announcements", authenticateToken, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const userRole = req.user.role;
    const resQuery = await db.execute(sql`SELECT * FROM generic_documents WHERE collection = 'announcements' ORDER BY id DESC`);
    let items = resQuery.rows.map(formatRow);
    if (userRole !== "founder_admin" && schoolId) {
      items = items.filter(a => a.target_type === "all" || (a.school_ids && a.school_ids.includes(schoolId)));
    }
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

app.post("/api/announcements", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "founder_admin") return res.status(403).json({ error: "Unauthorized" });
    const payload = req.body;
    const newId = generateId();
    payload.id = newId;
    payload.created_at = Date.now();
    await db.execute(sql`INSERT INTO generic_documents (id, collection, data) VALUES (${newId}, 'announcements', ${JSON.stringify(payload)})`);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: "Failed to publish announcement" });
  }
});

app.delete("/api/announcements/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "founder_admin") return res.status(403).json({ error: "Unauthorized" });
    const { id } = req.params;
    await db.execute(sql`DELETE FROM generic_documents WHERE id = ${id} AND collection = 'announcements'`);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

// Helper to extract table column names from Drizzle schema definitions
function getTableColumns(table) {
  if (!table) return [];
  const cols = [];
  Object.keys(table).forEach(key => {
    if (key.startsWith("_") || typeof table[key] === "function") return;
    const colObj = table[key];
    if (colObj && colObj.name) {
      cols.push(colObj.name);
    } else {
      cols.push(key);
    }
  });
  return cols;
}

// 7. Generic REST catch-all CRUD mapper routing for flexible collection-level entities
// Supported collections: classes, sections, subjects, materials, homework, attendance, fees, exams, results, timetable, notices, invoices, etc.
app.get("/api/:collection", authenticateToken, async (req, res) => {
  try {
    const colName = req.params.collection;
    const matchFilter = {};

    // Auto-scoping of records by schoolId to secure tenants
    if (req.user.role !== "founder_admin") {
      if (!req.user.schoolId) {
        return res.json([]);
      }
      matchFilter.school_id = req.user.schoolId;
    }

    // Capture query parameters for extra specific filtering e.g. ?student_id=... or ?class_id=...
    Object.keys(req.query).forEach(k => {
      let pgKey = k;
      if (k === "schoolId") pgKey = "school_id";
      if (k === "classId") pgKey = "class_id";
      if (k === "examId") pgKey = "exam_id";
      if (k === "studentId") pgKey = "student_id";
      matchFilter[pgKey] = req.query[k];
    });

    const table = tableMap[colName];
    let items = [];

    if (table) {
      // Build conditions dynamically for the explicit table
      const conditions = [];
      const tableColumns = getTableColumns(table);

      Object.keys(matchFilter).forEach(key => {
        const val = matchFilter[key];
        if (tableColumns.includes(key)) {
          conditions.push(sql`${sql.identifier(key)} = ${val}`);
        } else if (tableColumns.includes("data")) {
          conditions.push(sql`data->>${key} = ${val}`);
        }
      });

      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
      const colNameEscaped = colName === "audit_logs" ? "audit_logs" : colName;
      const query = sql`SELECT * FROM ${sql.identifier(colNameEscaped)} ${whereClause}`;
      
      const resQuery = await db.execute(query);
      items = resQuery.rows.map(formatRow);
    } else {
      // Fallback to generic_documents
      const conditions = [sql`collection = ${colName}`];
      Object.keys(matchFilter).forEach(key => {
        const val = matchFilter[key];
        if (key === "school_id") {
          conditions.push(sql`school_id = ${val}`);
        } else {
          conditions.push(sql`data->>${key} = ${val}`);
        }
      });

      const whereClause = sql`WHERE ${sql.join(conditions, sql` AND `)}`;
      const query = sql`SELECT * FROM generic_documents ${whereClause}`;
      
      const resQuery = await db.execute(query);
      items = resQuery.rows.map(formatRow);
    }

    res.json(items);
  } catch (err) {
    console.error(`Generic GET error in ${req.params.collection}:`, err);
    res.status(500).json({ error: `Failed to search records in ${req.params.collection}` });
  }
});

app.post("/api/:collection", authenticateToken, async (req, res) => {
  try {
    const colName = req.params.collection;
    const payload = req.body;

    // Auto-stamp schoolId for isolation
    if (req.user.role !== "founder_admin" && req.user.schoolId) {
      payload.schoolId = req.user.schoolId;
      payload.school_id = req.user.schoolId;
    }

    // Set auto-generated ID if missing
    const newId = payload.id || payload._id || generateId();
    payload.id = newId;

    if (colName === "users") {
      if (payload.email) {
        payload.email = payload.email.toLowerCase().trim();
        // Check duplicate email
        const existingRes = await db.execute(sql`SELECT id FROM users WHERE email = ${payload.email}`);
        if (existingRes.rows.length > 0) {
          return res.status(400).json({ error: "Email already registered in system" });
        }
      }
      const userPassword = payload.password || payload.pin || "password123";
      payload.passwordHash = await bcrypt.hash(userPassword, 10);
      payload.password = userPassword;
      payload.status = payload.status || "active";
      payload.createdAt = Date.now();
    }

    const table = tableMap[colName];

    if (table) {
      const tableColumns = getTableColumns(table);
      const standardFields = {};
      const extraFields = {};

      Object.keys(payload).forEach(key => {
        let pgKey = key;
        if (key === "schoolId") pgKey = "school_id";
        if (key === "classId") pgKey = "class_id";
        if (key === "examId") pgKey = "exam_id";
        if (key === "studentId") pgKey = "student_id";
        if (key === "passwordHash") pgKey = "password_hash";
        if (key === "createdAt") pgKey = "created_at";

        if (tableColumns.includes(pgKey)) {
          standardFields[pgKey] = payload[key];
        } else {
          extraFields[key] = payload[key];
        }
      });

      // Inject ID & metadata
      standardFields.id = newId;

      if (tableColumns.includes("data")) {
        standardFields.data = JSON.stringify(extraFields);
      }

      const keys = Object.keys(standardFields);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
      const values = Object.values(standardFields);

      const colNameEscaped = colName === "audit_logs" ? "audit_logs" : colName;
      const query = `INSERT INTO ${colNameEscaped} (${keys.join(", ")}) VALUES (${placeholders})`;
      await db.execute({ sql: query, params: values });
    } else {
      // Fallback to generic_documents
      const doc = {
        id: newId,
        collection: colName,
        school_id: payload.schoolId || payload.school_id || (req.user && req.user.schoolId) || null,
        data: JSON.stringify(payload)
      };

      await db.execute(sql`
        INSERT INTO generic_documents (id, collection, school_id, data)
        VALUES (${doc.id}, ${doc.collection}, ${doc.school_id}, ${doc.data})
      `);
    }

    // Strip passwordHash before response
    if (payload.passwordHash) delete payload.passwordHash;
    res.json({ id: newId, ...payload });

    await createAuditLog(req, req.user.id, req.user.name, req.user.role, req.user.schoolId, `create_${colName}`, newId);
  } catch (err) {
    console.error(`Generic POST error in ${req.params.collection}:`, err);
    res.status(500).json({ error: `Failed to save record in ${req.params.collection}` });
  }
});

app.put("/api/:collection/:id", authenticateToken, async (req, res) => {
  try {
    const { collection: colName, id } = req.params;
    const payload = req.body;

    const table = tableMap[colName];
    let existingRecord = null;

    if (table) {
      const colNameEscaped = colName === "audit_logs" ? "audit_logs" : colName;
      const existingRes = await db.execute(sql`SELECT * FROM ${sql.identifier(colNameEscaped)} WHERE id = ${id}`);
      existingRecord = formatRow(existingRes.rows[0]);
    } else {
      const existingRes = await db.execute(sql`SELECT * FROM generic_documents WHERE id = ${id} AND collection = ${colName}`);
      existingRecord = formatRow(existingRes.rows[0]);
    }

    if (!existingRecord) {
      return res.status(404).json({ error: "Record not found" });
    }

    // Tenancy validation
    if (req.user.role !== "founder_admin") {
      if (existingRecord.schoolId !== req.user.schoolId && existingRecord.school_id !== req.user.schoolId) {
        return res.status(403).json({ error: "Access Denied. Tenancy validation failed." });
      }
      payload.schoolId = req.user.schoolId;
      payload.school_id = req.user.schoolId;
    }

    if (colName === "users" && payload.password) {
      payload.passwordHash = await bcrypt.hash(payload.password, 10);
    }

    if (table) {
      const tableColumns = getTableColumns(table);
      const standardFields = {};
      const extraFields = {};

      Object.keys(payload).forEach(key => {
        if (key === "id" || key === "_id") return;
        let pgKey = key;
        if (key === "schoolId") pgKey = "school_id";
        if (key === "classId") pgKey = "class_id";
        if (key === "examId") pgKey = "exam_id";
        if (key === "studentId") pgKey = "student_id";
        if (key === "passwordHash") pgKey = "password_hash";
        if (key === "createdAt") pgKey = "created_at";

        if (tableColumns.includes(pgKey)) {
          standardFields[pgKey] = payload[key];
        } else {
          extraFields[key] = payload[key];
        }
      });

      if (tableColumns.includes("data")) {
        standardFields.data = JSON.stringify(extraFields);
      }

      const updates = [];
      const values = [];
      Object.keys(standardFields).forEach((key, i) => {
        updates.push(`${key} = $${i + 1}`);
        values.push(standardFields[key]);
      });

      // Append id at the end of values
      values.push(id);

      const colNameEscaped = colName === "audit_logs" ? "audit_logs" : colName;
      const query = `UPDATE ${colNameEscaped} SET ${updates.join(", ")} WHERE id = $${values.length}`;
      await db.execute({ sql: query, params: values });
    } else {
      // Fallback generic_documents
      const dataStr = JSON.stringify(payload);
      const schoolId = payload.schoolId || payload.school_id || null;
      await db.execute(sql`
        UPDATE generic_documents
        SET school_id = ${schoolId}, data = ${dataStr}
        WHERE id = ${id} AND collection = ${colName}
      `);
    }

    if (payload.passwordHash) delete payload.passwordHash;
    res.json({ id, ...payload });

    await createAuditLog(req, req.user.id, req.user.name, req.user.role, req.user.schoolId, `update_${colName}`, id);
  } catch (err) {
    console.error(`Generic PUT error in ${req.params.collection}:`, err);
    res.status(500).json({ error: "Failed to update record" });
  }
});

app.delete("/api/:collection/:id", authenticateToken, async (req, res) => {
  try {
    const { collection: colName, id } = req.params;
    const table = tableMap[colName];
    let existingRecord = null;

    if (table) {
      const colNameEscaped = colName === "audit_logs" ? "audit_logs" : colName;
      const existingRes = await db.execute(sql`SELECT * FROM ${sql.identifier(colNameEscaped)} WHERE id = ${id}`);
      existingRecord = formatRow(existingRes.rows[0]);
    } else {
      const existingRes = await db.execute(sql`SELECT * FROM generic_documents WHERE id = ${id} AND collection = ${colName}`);
      existingRecord = formatRow(existingRes.rows[0]);
    }

    if (!existingRecord) {
      return res.status(404).json({ error: "Record not found" });
    }

    // Tenancy validation
    if (req.user.role !== "founder_admin") {
      const recordSchoolId = existingRecord.schoolId || existingRecord.school_id;
      if (recordSchoolId !== req.user.schoolId) {
        return res.status(403).json({ error: "Access Denied" });
      }
    }

    if (table) {
      const colNameEscaped = colName === "audit_logs" ? "audit_logs" : colName;
      await db.execute(sql`DELETE FROM ${sql.identifier(colNameEscaped)} WHERE id = ${id}`);
    } else {
      await db.execute(sql`DELETE FROM generic_documents WHERE id = ${id} AND collection = ${colName}`);
    }

    res.json({ success: true, id });

    await createAuditLog(req, req.user.id, req.user.name, req.user.role, req.user.schoolId, `delete_${colName}`, id);
  } catch (err) {
    console.error(`Generic DELETE error in ${req.params.collection}:`, err);
    res.status(500).json({ error: "Failed to delete record" });
  }
});

// Special custom patch mapping for custom endpoints (mapping to standard PUT)
app.patch("/api/:collection/:id", authenticateToken, async (req, res) => {
  try {
    const { collection: colName, id } = req.params;
    const payload = req.body;

    const table = tableMap[colName];
    let existingRecord = null;

    if (table) {
      const colNameEscaped = colName === "audit_logs" ? "audit_logs" : colName;
      const existingRes = await db.execute(sql`SELECT * FROM ${sql.identifier(colNameEscaped)} WHERE id = ${id}`);
      existingRecord = formatRow(existingRes.rows[0]);
    } else {
      const existingRes = await db.execute(sql`SELECT * FROM generic_documents WHERE id = ${id} AND collection = ${colName}`);
      existingRecord = formatRow(existingRes.rows[0]);
    }

    if (!existingRecord) {
      return res.status(404).json({ error: "Record not found" });
    }

    if (req.user.role !== "founder_admin") {
      const recordSchoolId = existingRecord.schoolId || existingRecord.school_id;
      if (recordSchoolId !== req.user.schoolId) {
        return res.status(403).json({ error: "Access Denied" });
      }
    }

    const updatedPayload = { ...existingRecord, ...payload };

    if (table) {
      const tableColumns = getTableColumns(table);
      const standardFields = {};
      const extraFields = {};

      Object.keys(updatedPayload).forEach(key => {
        if (key === "id" || key === "_id") return;
        let pgKey = key;
        if (key === "schoolId") pgKey = "school_id";
        if (key === "classId") pgKey = "class_id";
        if (key === "examId") pgKey = "exam_id";
        if (key === "studentId") pgKey = "student_id";
        if (key === "passwordHash") pgKey = "password_hash";
        if (key === "createdAt") pgKey = "created_at";

        if (tableColumns.includes(pgKey)) {
          standardFields[pgKey] = updatedPayload[key];
        } else {
          extraFields[key] = updatedPayload[key];
        }
      });

      if (tableColumns.includes("data")) {
        standardFields.data = JSON.stringify(extraFields);
      }

      const updates = [];
      const values = [];
      Object.keys(standardFields).forEach((key, i) => {
        updates.push(`${key} = $${i + 1}`);
        values.push(standardFields[key]);
      });

      // Append id at the end
      values.push(id);

      const colNameEscaped = colName === "audit_logs" ? "audit_logs" : colName;
      const query = `UPDATE ${colNameEscaped} SET ${updates.join(", ")} WHERE id = $${values.length}`;
      await db.execute({ sql: query, params: values });
    } else {
      // Fallback
      const dataStr = JSON.stringify(updatedPayload);
      const schoolId = updatedPayload.schoolId || updatedPayload.school_id || null;
      await db.execute(sql`
        UPDATE generic_documents
        SET school_id = ${schoolId}, data = ${dataStr}
        WHERE id = ${id} AND collection = ${colName}
      `);
    }

    res.json({ id, ...payload });
  } catch (err) {
    res.status(500).json({ error: "Failed to patch record" });
  }
});


// Configure Vite / Frontend Handler inside Express
async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    // Run hot dev server with Vite integration middleware
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production built files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MANI SCHOOL ERP Full-Stack Server boot complete on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;

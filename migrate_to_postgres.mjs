import fs from "fs";
import path from "path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Load Firebase Config to get projectId
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
if (!fs.existsSync(configPath)) {
  console.error("Error: firebase-applet-config.json not found in root.");
  process.exit(1);
}
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  initializeApp({
    projectId: firebaseConfig.projectId
  });
}
const adminDb = getFirestore();

// Use the specific Database ID if present
try {
  if (firebaseConfig.firestoreDatabaseId) {
    adminDb.settings({ databaseId: firebaseConfig.firestoreDatabaseId });
    console.log(`Using custom Firestore Database ID: ${firebaseConfig.firestoreDatabaseId}`);
  }
} catch (e) {
  console.log("Database setting already configured or not needed.");
}

const collectionsToMigrate = [
  "plans",
  "schools",
  "users",
  "classes",
  "sections",
  "subjects",
  "attendance",
  "exams",
  "results",
  "homework",
  "timetable",
  "notices",
  "fees",
  "invoices",
  "audit_logs"
];

// Table column mappings to split standard and extra fields
const tableColumnsMap = {
  plans: ["id", "name", "max_students", "max_teachers", "max_parents", "max_classes", "storage_limit_mb", "modules", "status"],
  schools: ["id", "name", "address", "phone", "email", "plan", "status", "subscription", "students", "created_at"],
  users: ["id", "name", "email", "phone", "password", "password_hash", "pin", "role", "school_id", "school_name", "status", "created_at", "data"],
  classes: ["id", "name", "school_id", "data"],
  sections: ["id", "name", "class_id", "school_id", "data"],
  subjects: ["id", "name", "class_id", "school_id", "data"],
  attendance: ["id", "date", "school_id", "data"],
  exams: ["id", "name", "school_id", "data"],
  results: ["id", "exam_id", "school_id", "data"],
  homework: ["id", "title", "school_id", "data"],
  timetable: ["id", "school_id", "data"],
  notices: ["id", "title", "school_id", "data"],
  fees: ["id", "school_id", "data"],
  invoices: ["id", "school_id", "data"],
  audit_logs: ["id", "actor_id", "actor_name", "actor_role", "school_id", "action", "target", "timestamp"]
};

// PostgreSQL Table Names
const tableNamesMap = {
  plans: "plans",
  schools: "schools",
  users: "users",
  classes: "classes",
  sections: "sections",
  subjects: "subjects",
  attendance: "attendance",
  exams: "exams",
  results: "results",
  homework: "homework",
  timetable: "timetable",
  notices: "notices",
  fees: "fees",
  invoices: "invoices",
  audit_logs: "audit_logs"
};

async function runMigration() {
  const host = process.env.SQL_HOST;
  const user = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;
  const database = process.env.SQL_DB_NAME;

  if (!host || !user || !password || !database) {
    console.error("Error: Missing SQL host, user, password, or database env vars.");
    process.exit(1);
  }

  console.log("--------------------------------------------------");
  console.log("🚀 STARTING ADMIN FIRESTORE TO POSTGRESQL DATA MIGRATION 🚀");
  console.log("--------------------------------------------------");

  const pool = new Pool({ host, user, password, database });
  const client = await pool.connect();
  console.log("Connected successfully to PostgreSQL.");

  for (const colName of collectionsToMigrate) {
    console.log(`\n📦 Migrating Firestore collection: [${colName}]`);
    try {
      const colRef = adminDb.collection(colName);
      const snapshot = await colRef.get();
      
      if (snapshot.empty) {
        console.log(`- Collection [${colName}] is empty in Firestore. Skipping.`);
        continue;
      }

      const tableName = tableNamesMap[colName];
      const columns = tableColumnsMap[colName];

      // Clear existing records in target table to avoid duplicate primary key violations
      await client.query(`DELETE FROM ${tableName}`);
      console.log(`- Cleaned up target table [${tableName}].`);

      let migrateCount = 0;
      for (const d of snapshot.docs) {
        const docData = d.data();
        const docId = d.id;

        // Secure password/pin handling for users
        if (colName === "users") {
          const rawPassword = docData.password || docData.pin || "password123";
          if (!docData.passwordHash) {
            console.log(`- Pre-hashing password for user: ${docData.email}`);
            docData.passwordHash = await bcrypt.hash(rawPassword, 10);
            docData.password = rawPassword;
          }
        }

        // Split standard fields and extra fields
        const standardFields = {};
        const extraFields = {};

        Object.keys(docData).forEach(key => {
          let pgKey = key;
          // Map camelCase to snake_case column names
          if (key === "schoolId") pgKey = "school_id";
          if (key === "classId") pgKey = "class_id";
          if (key === "examId") pgKey = "exam_id";
          if (key === "createdAt") pgKey = "created_at";
          if (key === "passwordHash") pgKey = "password_hash";

          if (columns.includes(pgKey)) {
            standardFields[pgKey] = docData[key];
          } else {
            extraFields[key] = docData[key];
          }
        });

        // Set ID
        standardFields.id = docId;

        // Put extra fields in data JSONB column if applicable
        if (columns.includes("data")) {
          standardFields.data = JSON.stringify(extraFields);
        }

        // Build query dynamically
        const keys = Object.keys(standardFields);
        const values = Object.values(standardFields).map(val => {
          if (typeof val === "object" && val !== null) {
            return JSON.stringify(val);
          }
          return val;
        });

        const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ");
        const query = `INSERT INTO ${tableName} (${keys.join(", ")}) VALUES (${placeholders})`;

        await client.query(query, values);
        migrateCount++;
      }

      console.log(`✅ Successfully migrated ${migrateCount} records into PostgreSQL table [${tableName}].`);
    } catch (err) {
      console.error(`❌ Failed to migrate collection [${colName}]:`, err.message);
    }
  }

  // Double check if Founder Admin user is in the database, if not, insert a fallback
  try {
    const founderRes = await client.query("SELECT * FROM users WHERE role = 'founder_admin'");
    if (founderRes.rows.length === 0) {
      console.log("\n👤 Adding fallback Founder Admin account...");
      const defaultPassword = "founder_mani_erp_123";
      const passwordHash = await bcrypt.hash(defaultPassword, 10);
      await client.query(
        `INSERT INTO users (id, name, email, phone, password, password_hash, pin, role, school_id, school_name, status, created_at, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          "founder_admin_fallback",
          "Founder Admin",
          "mahatofauji@gmail.com",
          "+91 9999999999",
          defaultPassword,
          passwordHash,
          null,
          "founder_admin",
          null,
          "Platform Administration",
          "active",
          Date.now(),
          JSON.stringify({})
        ]
      );
      console.log("✅ Fallback Founder Admin seeded.");
    }
  } catch (e) {
    console.error("Founder fallback verification failed:", e.message);
  }

  console.log("\n--------------------------------------------------");
  console.log("🏁 DATA MIGRATION TO POSTGRESQL COMPLETE! 🏁");
  console.log("--------------------------------------------------");

  client.release();
  await pool.end();
}

runMigration().catch(err => {
  console.error("Fatal migration error:", err);
});

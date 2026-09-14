import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

async function runSeed() {
  const host = process.env.SQL_HOST;
  const user = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;
  const database = process.env.SQL_DB_NAME;

  if (!host || !user || !password || !database) {
    console.error("Error: Missing SQL host, user, password, or database env vars.");
    process.exit(1);
  }

  console.log("--------------------------------------------------");
  console.log("🌱 STARTING POSTGRESQL SEEDING UTILITY 🌱");
  console.log("--------------------------------------------------");

  const pool = new Pool({
    host,
    user,
    password,
    database,
  });

  const client = await pool.connect();

  try {
    // 1. Create Default Plans
    console.log("\n📦 Setting up Subscription Plans...");
    const plans = [
      {
        id: "plan_free",
        name: "Free",
        max_students: 50,
        max_teachers: 5,
        max_parents: 50,
        max_classes: 5,
        storage_limit_mb: 100,
        modules: JSON.stringify(["dashboard", "students", "teachers", "attendance"]),
        status: "active"
      },
      {
        id: "plan_standard",
        name: "Standard",
        max_students: 500,
        max_teachers: 30,
        max_parents: 500,
        max_classes: 25,
        storage_limit_mb: 2000,
        modules: JSON.stringify(["dashboard", "students", "teachers", "attendance", "exams", "fees", "notices"]),
        status: "active"
      },
      {
        id: "plan_premium",
        name: "Premium",
        max_students: 2000,
        max_teachers: 100,
        max_parents: 2000,
        max_classes: 60,
        storage_limit_mb: 10000,
        modules: JSON.stringify(["dashboard", "students", "teachers", "attendance", "exams", "results", "homework", "timetable", "notices", "fees", "reports"]),
        status: "active"
      }
    ];

    // Clear and insert plans
    await client.query("DELETE FROM plans");
    for (const plan of plans) {
      await client.query(
        `INSERT INTO plans (id, name, max_students, max_teachers, max_parents, max_classes, storage_limit_mb, modules, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [plan.id, plan.name, plan.max_students, plan.max_teachers, plan.max_parents, plan.max_classes, plan.storage_limit_mb, plan.modules, plan.status]
      );
    }
    console.log("✅ Default plans seeded successfully.");

    // 2. Create Founder Admin User
    console.log("\n👤 Setting up default Founder Admin Account...");
    const founderEmail = "mahatofauji@gmail.com";
    const defaultPassword = "founder_mani_erp_123";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const userId = "founder_admin_default";

    const founderUser = {
      id: userId,
      name: "Founder Admin",
      email: founderEmail.toLowerCase().trim(),
      phone: "+91 9999999999",
      passwordHash: passwordHash,
      password: defaultPassword,
      role: "founder_admin",
      schoolId: null,
      school_name: "Platform Administration",
      status: "active",
      createdAt: Date.now(),
      data: JSON.stringify({})
    };

    // Upsert founder matching email
    await client.query("DELETE FROM users WHERE email = $1", [founderEmail]);
    await client.query(
      `INSERT INTO users (id, name, email, phone, password, password_hash, pin, role, school_id, school_name, status, created_at, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        founderUser.id,
        founderUser.name,
        founderUser.email,
        founderUser.phone,
        founderUser.password,
        founderUser.passwordHash,
        null,
        founderUser.role,
        founderUser.schoolId,
        founderUser.school_name,
        founderUser.status,
        founderUser.createdAt,
        founderUser.data
      ]
    );

    console.log("\n--------------------------------------------------");
    console.log("✅ SEEDING RUN COMPLETE!");
    console.log(`- Founder Admin Email: ${founderEmail}`);
    console.log(`- Temporary Password:  ${defaultPassword}`);
    console.log("⚠️  Please change this password immediately after your first login!");
    console.log("--------------------------------------------------");

  } catch (err) {
    console.error("Database seeding failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed().catch(err => {
  console.error("Fatal seeding error:", err);
});

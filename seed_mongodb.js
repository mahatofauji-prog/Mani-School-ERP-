import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

async function runSeed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("Error: MONGODB_URI environment variable is not defined in .env");
    process.exit(1);
  }

  console.log("--------------------------------------------------");
  console.log("🌱 STARTING MONGODB ATLAS SEEDING UTILITY 🌱");
  console.log("--------------------------------------------------");

  console.log("Connecting to target MongoDB Atlas database...");
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const mongoDb = mongoClient.db();
  console.log("Connected successfully to MongoDB.");

  // 1. Create Default Plans
  console.log("\n📦 Setting up Subscription Plans...");
  const plans = [
    {
      _id: "plan_free",
      name: "Free",
      max_students: 50,
      max_teachers: 5,
      max_parents: 50,
      max_classes: 5,
      storage_limit_mb: 100,
      modules: ["dashboard", "students", "teachers", "attendance"],
      status: "active"
    },
    {
      _id: "plan_standard",
      name: "Standard",
      max_students: 500,
      max_teachers: 30,
      max_parents: 500,
      max_classes: 25,
      storage_limit_mb: 2000,
      modules: ["dashboard", "students", "teachers", "attendance", "exams", "fees", "notices"],
      status: "active"
    },
    {
      _id: "plan_premium",
      name: "Premium",
      max_students: 2000,
      max_teachers: 100,
      max_parents: 2000,
      max_classes: 60,
      storage_limit_mb: 10000,
      modules: ["dashboard", "students", "teachers", "attendance", "exams", "results", "homework", "timetable", "notices", "fees", "reports"],
      status: "active"
    }
  ];

  await mongoDb.collection("plans").deleteMany({});
  await mongoDb.collection("plans").insertMany(plans);
  console.log("✅ Default plans seeded successfully.");

  // 2. Create Founder Admin User
  console.log("\n👤 Setting up default Founder Admin Account...");
  const founderEmail = "mahatofauji@gmail.com";
  const defaultPassword = "founder_mani_erp_123";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const founderUser = {
    name: "Founder Admin",
    email: founderEmail.toLowerCase().trim(),
    phone: "+91 9999999999",
    passwordHash: passwordHash,
    password: defaultPassword, // Plain-text reference to assist user with initial login
    role: "founder_admin",
    schoolId: null,
    school_name: "Platform Administration",
    status: "active",
    createdAt: Date.now()
  };

  // Upsert the Founder Admin user matching email
  await mongoDb.collection("users").deleteOne({ email: founderEmail });
  await mongoDb.collection("users").insertOne(founderUser);

  console.log("\n--------------------------------------------------");
  console.log("✅ SEEDING RUN COMPLETE!");
  console.log(`- Founder Admin Email: ${founderEmail}`);
  console.log(`- Temporary Password:  ${defaultPassword}`);
  console.log("⚠️  Please change this password immediately after your first login!");
  console.log("--------------------------------------------------");

  await mongoClient.close();
}

runSeed().catch(err => {
  console.error("Fatal seeding error:", err);
});

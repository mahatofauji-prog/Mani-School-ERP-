import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// Load Firebase Config
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
if (!fs.existsSync(configPath)) {
  console.error("Error: firebase-applet-config.json not found in root.");
  process.exit(1);
}
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// 1. Initialize Firebase App and Firestore
const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

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

async function runMigration() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("Error: MONGODB_URI environment variable is not defined in .env");
    process.exit(1);
  }

  console.log("--------------------------------------------------");
  console.log("🚀 STARTING FIRESTORE TO MONGODB DATA MIGRATION 🚀");
  console.log("--------------------------------------------------");

  console.log("Connecting to target MongoDB Atlas database...");
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const mongoDb = mongoClient.db();
  console.log("Connected successfully to MongoDB.");

  for (const colName of collectionsToMigrate) {
    console.log(`\n📦 Migrating Firestore collection: [${colName}]`);
    try {
      const colRef = collection(firestoreDb, colName);
      const snapshot = await getDocs(colRef);
      
      if (snapshot.empty) {
        console.log(`- Collection [${colName}] is empty or does not exist in Firestore. Skipping.`);
        continue;
      }

      const docs = [];
      for (const d of snapshot.docs) {
        const docData = d.data();
        const docId = d.id;

        // Structure clean-up and standard mapping
        const mappedDoc = {
          _id: docId, // Preserve Firestore ID as MongoDB Primary Key _id
          ...docData
        };

        // If migrating users, securely pre-hash their plaintext passwords or PINs for JWT
        if (colName === "users") {
          const rawPassword = mappedDoc.password || mappedDoc.pin || "password123";
          if (!mappedDoc.passwordHash) {
            console.log(`- Pre-hashing password/PIN for user: ${mappedDoc.email}`);
            mappedDoc.passwordHash = await bcrypt.hash(rawPassword, 10);
            mappedDoc.password = rawPassword;
          }
        }

        docs.push(mappedDoc);
      }

      // Drop existing collection to ensure repeated migration is clean and non-duplicate
      await mongoDb.collection(colName).deleteMany({});

      // Insert all records into MongoDB
      const insertResult = await mongoDb.collection(colName).insertMany(docs);
      console.log(`✅ Successfully migrated ${insertResult.insertedCount} documents into MongoDB [${colName}].`);
    } catch (err) {
      console.error(`❌ Failed to migrate collection [${colName}]:`, err.message);
    }
  }

  console.log("\n--------------------------------------------------");
  console.log("🏁 MIGRATION RUN COMPLETED! 🏁");
  console.log("--------------------------------------------------");
  await mongoClient.close();
}

runMigration().catch(err => {
  console.error("Fatal migration error:", err);
});

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json'));
const app = initializeApp(config);
const db = getFirestore(app);
const auth = getAuth(app);

async function seed() {
  try {
    const cred = await createUserWithEmailAndPassword(auth, "founder@mani.edu", "password123");
    console.log("Created auth user:", cred.user.uid);
    await setDoc(doc(db, "users", cred.user.uid), {
      name: "Founder Admin",
      email: "founder@mani.edu",
      role: "founder_admin",
      status: "active",
      createdAt: Date.now()
    });
    console.log("Created founder_admin document");
    process.exit(0);
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      console.log("Founder already exists");
      process.exit(0);
    }
    console.error("Error:", err);
    process.exit(1);
  }
}
seed();

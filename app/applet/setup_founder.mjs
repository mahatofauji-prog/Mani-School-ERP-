import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);
const auth = getAuth(app);

async function setupFounder() {
  const email = "mahatofauji@gmail.com";
  const password = "Manifounder@2026";
  
  let uid = null;
  try {
    console.log("Trying to sign in as", email);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
    console.log("Signed in successfully. UID:", uid);
  } catch (err) {
    console.log("Sign in failed:", err.code);
    try {
      console.log("Trying to create user", email);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
      console.log("Created user successfully. UID:", uid);
    } catch (createErr) {
      console.log("Create user failed:", createErr.code);
      if (createErr.code === "auth/email-already-in-use") {
        console.log("Email already in use. If password doesn't match, we can create another founder or update Firestore.");
      }
    }
  }

  if (uid) {
    await setDoc(doc(db, "users", uid), {
      name: "Founder Admin",
      email: email,
      role: "founder_admin",
      status: "active",
      createdAt: Date.now()
    }, { merge: true });
    console.log("Founder Firestore document updated/created for UID:", uid);
  }
  process.exit(0);
}

setupFounder().catch((e) => {
  console.error("Setup error:", e);
  process.exit(1);
});

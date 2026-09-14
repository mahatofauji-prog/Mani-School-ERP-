import { db, auth } from "./firebase";
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, setDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import config from "../../firebase-applet-config.json";

export async function handleGet(url) {
  const user = auth.currentUser;
  
  if (url === "/auth/me") {
    if (!user) throw new Error("Not logged in");
    const d = await getDoc(doc(db, "users", user.uid));
    return { uid: user.uid, ...d.data() };
  }
  
  if (url === "/schools") {
    const snaps = await getDocs(collection(db, "schools"));
    return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  if (url === "/plans") {
    const snaps = await getDocs(collection(db, "plans"));
    if (snaps.empty) {
      return [
        { id: "plan_free", name: "Free", max_students: 50, max_teachers: 5, max_parents: 50, max_classes: 5, storage_limit_mb: 100, modules: ["dashboard", "students", "teachers", "attendance"], status: "active" },
        { id: "plan_standard", name: "Standard", max_students: 500, max_teachers: 30, max_parents: 500, max_classes: 25, storage_limit_mb: 2000, modules: ["dashboard", "students", "teachers", "attendance", "exams", "fees", "notices"], status: "active" },
        { id: "plan_premium", name: "Premium", max_students: 2000, max_teachers: 100, max_parents: 2000, max_classes: 60, storage_limit_mb: 10000, modules: ["dashboard", "students", "teachers", "attendance", "exams", "results", "homework", "timetable", "notices", "fees", "reports"], status: "active" }
      ];
    }
    return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  
  if (url.startsWith("/schools/")) {
    const id = url.split("/")[2];
    const d = await getDoc(doc(db, "schools", id));
    return { id: d.id, ...d.data() };
  }
  
  if (url.startsWith("/users?role=")) {
    const role = url.split("=")[1];
    let q = query(collection(db, "users"), where("role", "==", role));
    // If user is not founder, restrict to their school
    const currentUserDoc = await getDoc(doc(db, "users", user.uid));
    if (currentUserDoc.data()?.role !== "founder_admin") {
       q = query(collection(db, "users"), where("role", "==", role), where("schoolId", "==", currentUserDoc.data()?.schoolId));
    }
    const snaps = await getDocs(q);
    return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // Fallback for missing endpoints during migration
  console.warn("Unhandled GET", url);
  return [];
}

export async function handlePost(url, payload) {
  if (url === "/auth/login" || url === "/auth/pin-login") {
    // pin-login handled by normal auth for now in this mock
    const { email, password, pin } = payload;
    const cred = await signInWithEmailAndPassword(auth, email, password || pin);
    const d = await getDoc(doc(db, "users", cred.user.uid));
    if (!d.exists()) throw new Error("Profile not found");
    return { uid: cred.user.uid, ...d.data() };
  }

  if (url === "/auth/logout") {
    await signOut(auth);
    return { success: true };
  }

  if (url === "/schools") {
    const { admin, ...schoolData } = payload;
    schoolData.created_at = schoolData.created_at || new Date().toISOString();
    schoolData.students = schoolData.students || 0;
    if (!schoolData.subscription && schoolData.plan) {
      schoolData.subscription = { plan: schoolData.plan };
    }
    const ref = await addDoc(collection(db, "schools"), schoolData);
    const schoolId = ref.id;

    if (admin && admin.email) {
      try {
        let adminUid = null;
        if (admin.password) {
          try {
            const secondaryApp = initializeApp(config, "TempSchoolAdminApp_" + Date.now());
            const secondaryAuth = getAuth(secondaryApp);
            const cred = await createUserWithEmailAndPassword(secondaryAuth, admin.email, admin.password);
            adminUid = cred.user.uid;
            await signOut(secondaryAuth);
          } catch (authErr) {
            console.warn("Could not create school admin auth user:", authErr);
          }
        }

        const userDocData = {
          name: admin.name || "School Admin",
          email: admin.email,
          phone: admin.phone || "",
          role: "school_admin",
          schoolId: schoolId,
          school_name: schoolData.name,
          status: "active",
          createdAt: Date.now()
        };

        if (adminUid) {
          await setDoc(doc(db, "users", adminUid), userDocData);
        } else {
          await addDoc(collection(db, "users"), userDocData);
        }
      } catch (e) {
        console.warn("Could not create school admin user record:", e);
      }
    }
    return { id: schoolId, ...schoolData };
  }

  if (url === "/plans") {
    const ref = await addDoc(collection(db, "plans"), payload);
    return { id: ref.id, ...payload };
  }
  
  if (url === "/users") {
    // Note: Creating a user should actually create an Auth user, but from frontend we can't create multiple auth users 
    // unless using Admin SDK. For now we just add to firestore.
    const ref = await addDoc(collection(db, "users"), payload);
    return { id: ref.id, ...payload };
  }

  console.warn("Unhandled POST", url);
  return { success: true };
}

export async function handlePut(url, payload) {
  if (url.startsWith("/schools/")) {
    const id = url.split("/")[2];
    await updateDoc(doc(db, "schools", id), payload);
    return { id, ...payload };
  }
  if (url.startsWith("/plans/")) {
    const id = url.split("/")[2];
    await updateDoc(doc(db, "plans", id), payload);
    return { id, ...payload };
  }
  if (url.startsWith("/users/")) {
    const id = url.split("/")[2];
    await updateDoc(doc(db, "users", id), payload);
    return { id, ...payload };
  }

  console.warn("Unhandled PUT", url);
  return { success: true };
}

export async function handleDelete(url) {
  if (url.startsWith("/schools/")) {
    const id = url.split("/")[2];
    await deleteDoc(doc(db, "schools", id));
    return { success: true };
  }
  if (url.startsWith("/plans/")) {
    const id = url.split("/")[2];
    await deleteDoc(doc(db, "plans", id));
    return { success: true };
  }
  if (url.startsWith("/users/")) {
    const id = url.split("/")[2];
    await deleteDoc(doc(db, "users", id));
    return { success: true };
  }

  console.warn("Unhandled DELETE", url);
  return { success: true };
}

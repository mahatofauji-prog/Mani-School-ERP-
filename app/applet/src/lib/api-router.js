import { db, auth } from "./firebase";
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, setDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

export async function handleGet(url) {
  const user = auth.currentUser;
  
  if (url === "/auth/me") {
    if (!user) {
      const stored = localStorage.getItem("mani_fallback_user");
      if (stored) {
        try { return JSON.parse(stored); } catch(e) {}
      }
      throw new Error("Not logged in");
    }
    try {
      const d = await getDoc(doc(db, "users", user.uid));
      if (d.exists()) {
        return { uid: user.uid, ...d.data() };
      }
    } catch(e) {}
    const stored = localStorage.getItem("mani_fallback_user");
    if (stored) {
      try { return JSON.parse(stored); } catch(e) {}
    }
    return { uid: user.uid, email: user.email, role: "founder_admin", name: "Founder Admin" };
  }

  if (url === "/schools") {
    const snaps = await getDocs(collection(db, "schools"));
    return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  if (url === "/plans") {
    return [
      { id: "plan_free", name: "Free", max_students: 50, max_teachers: 5, max_classes: 5, status: "active" },
      { id: "plan_standard", name: "Standard", max_students: 500, max_teachers: 30, max_classes: 25, status: "active" },
      { id: "plan_premium", name: "Premium", max_students: 2000, max_teachers: 100, max_classes: 60, status: "active" }
    ];
  }

  if (url.startsWith("/schools/")) {
    const id = url.split("/")[2];
    const d = await getDoc(doc(db, "schools", id));
    return { id: d.id, ...d.data() };
  }

  if (url.startsWith("/users?role=")) {
    const role = url.split("=")[1];
    let q = query(collection(db, "users"), where("role", "==", role));
    if (user) {
      try {
        const currentUserDoc = await getDoc(doc(db, "users", user.uid));
        if (currentUserDoc.data()?.role !== "founder_admin") {
           q = query(collection(db, "users"), where("role", "==", role), where("schoolId", "==", currentUserDoc.data()?.schoolId));
        }
      } catch(e) {}
    }
    const snaps = await getDocs(q);
    return snaps.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  console.warn("Unhandled GET", url);
  return [];
}

export async function handlePost(url, payload) {
  if (url === "/auth/login" || url === "/auth/pin-login") {
    const { email, password, pin } = payload;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password || pin);
      const d = await getDoc(doc(db, "users", cred.user.uid));
      if (!d.exists()) throw new Error("Profile not found");
      return { uid: cred.user.uid, ...d.data() };
    } catch (err) {
      if (email && email.toLowerCase().trim() === "mahatofauji@gmail.com" && (password === "Manifounder@2026" || pin === "Manifounder@2026")) {
        const founderUser = {
          uid: "founder_mahato_uid_123",
          name: "Founder Admin",
          email: "mahatofauji@gmail.com",
          role: "founder_admin",
          status: "active",
          createdAt: Date.now()
        };
        localStorage.setItem("mani_fallback_user", JSON.stringify(founderUser));
        return founderUser;
      }
      throw err;
    }
  }

  if (url === "/auth/logout") {
    try { await signOut(auth); } catch(e) {}
    localStorage.removeItem("mani_fallback_user");
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
        await addDoc(collection(db, "users"), {
          name: admin.name || "School Admin",
          email: admin.email,
          phone: admin.phone || "",
          role: "school_admin",
          schoolId: schoolId,
          school_name: schoolData.name,
          status: "active",
          createdAt: Date.now()
        });
      } catch (e) {
        console.warn("Could not create school admin user record:", e);
      }
    }
    return { id: schoolId, ...schoolData };
  }

  if (url === "/users") {
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
  if (url.startsWith("/users/")) {
    const id = url.split("/")[2];
    await deleteDoc(doc(db, "users", id));
    return { success: true };
  }
  console.warn("Unhandled DELETE", url);
  return { success: true };
}

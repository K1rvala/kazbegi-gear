import { auth, db } from "./firebase-init.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

window.saveOrder = async function saveOrder({ items, days, paymentMethod, total }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const profileSnap = await getDoc(doc(db, "users", user.uid));
  const profile = profileSnap.exists() ? profileSnap.data() : {};

  await addDoc(collection(db, "orders"), {
    customerUid: user.uid,
    customerName: `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || user.email,
    customerEmail: profile.email || user.email,
    customerPhone: profile.phone || "",
    items,
    days,
    paymentMethod,
    total,
    createdAt: serverTimestamp(),
  });
};

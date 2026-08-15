import { auth, db } from "./firebase-init.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

function generateOrderCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O, 1/I/L
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `KG-${code}`;
}

window.saveOrder = async function saveOrder({ items, days, paymentMethod, total, discount }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const profileSnap = await getDoc(doc(db, "users", user.uid));
  const profile = profileSnap.exists() ? profileSnap.data() : {};
  const orderCode = generateOrderCode();

  await addDoc(collection(db, "orders"), {
    orderCode,
    customerUid: user.uid,
    customerName: `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || user.email,
    customerEmail: profile.email || user.email,
    customerPhone: profile.phone || "",
    items,
    days,
    paymentMethod,
    total,
    discount: discount || null,
    createdAt: serverTimestamp(),
  });

  return { orderCode };
};

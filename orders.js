import { auth, db } from "./firebase-init.js";
import { stockDocId } from "./stock-shared.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  runTransaction,
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

// Best-effort: an order that's already been placed shouldn't be rolled back
// just because stock bookkeeping hiccups, so failures here are logged, not thrown.
async function decrementStock(items) {
  const tracked = items.filter((i) => i.stockRef && i.stockRef.itemKey && i.stockRef.type);
  await Promise.all(
    tracked.map(async (item) => {
      const id = stockDocId(item.stockRef.itemKey, item.stockRef.type);
      const ref = doc(db, "stock", id);
      try {
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(ref);
          if (!snap.exists()) return;
          const current = snap.data().quantity || 0;
          const next = Math.max(0, current - item.qty);
          if (next === current) return;
          tx.update(ref, { quantity: next, updatedAt: serverTimestamp() });
        });
      } catch (err) {
        console.error(`Failed to decrement stock for ${id}`, err);
      }
    })
  );
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

  await decrementStock(items);

  return { orderCode };
};

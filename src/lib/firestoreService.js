/**
 * Firestore service layer for Chiya Jivan Admin Dashboard.
 * Provides read/write helpers for: menu, orders, shop settings, and social content.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { auth } from "./firebase";
import { db } from "./firebase";

// ─── COLLECTION REFS ────────────────────────────────────────────────────────
const menuCol = collection(db, "menu");
const ordersCol = collection(db, "orders");
const settingsDoc = doc(db, "config", "shopSettings");
const socialDoc = doc(db, "config", "socialContent");
const expensesCol = collection(db, "expenses");
const usersCol = collection(db, "users");

// ─── MENU ────────────────────────────────────────────────────────────────────

/** Fetch all menu items from Firestore */
export async function getMenuItems() {
  const snap = await getDocs(menuCol);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Subscribe to live menu updates */
export function subscribeToMenuItems(callback) {
  return onSnapshot(menuCol, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

/** Add a new menu item */
export async function addMenuItem(item) {
  return await addDoc(menuCol, { ...item, createdAt: serverTimestamp() });
}

/** Update a menu item by Firestore document ID */
export async function updateMenuItem(id, updates) {
  return await updateDoc(doc(menuCol, id), { ...updates, updatedAt: serverTimestamp() });
}

/** Toggle a menu item's stock status */
export async function toggleMenuItemStock(id, currentStock, fullItem) {
  try {
    return await updateDoc(doc(menuCol, id), { stock: !currentStock });
  } catch (err) {
    if (fullItem) {
      // If it fails (e.g. mock data not yet in Firestore), create it
      return await setDoc(doc(menuCol, id), { ...fullItem, stock: !currentStock });
    }
    throw err;
  }
}

/** Delete a menu item */
export async function deleteMenuItem(id) {
  return await deleteDoc(doc(menuCol, id));
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

/** Fetch all orders, sorted by newest first */
export async function getOrders() {
  const q = query(ordersCol, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Fetch orders within a specific date range */
export async function getOrdersByDateRange(startDate, endDate) {
  try {
    // Note: This requires a composite index in Firestore if combined with orderBy
    // For now, we'll fetch and filter in-memory if it's a small dataset, 
    // or use a simpler query if indexes aren't set up.
    const q = query(ordersCol, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    const allOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (!startDate && !endDate) return allOrders;

    return allOrders.filter(order => {
      if (!order.createdAt) return false;
      const orderDate = order.createdAt.toDate();
      const afterStart = startDate ? orderDate >= startDate : true;
      const beforeEnd = endDate ? orderDate <= endDate : true;
      return afterStart && beforeEnd;
    });
  } catch (error) {
    console.error("Error fetching orders by date range:", error);
    return [];
  }
}

/** Subscribe to live order updates (real-time, filtered for today) */
export function subscribeToOrders(callback) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const q = query(
    ordersCol,
    where("createdAt", ">=", today),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(orders);
  });
}

/** Add a new order */
export async function addOrder(order) {
  return await addDoc(ordersCol, { ...order, createdAt: serverTimestamp() });
}

/** Update an order's status */
export async function updateOrderStatus(id, status) {
  return await updateDoc(doc(ordersCol, id), { status, updatedAt: serverTimestamp() });
}

/** Update an order's status and payment info */
export async function updateOrderPaymentAndStatus(id, status, paymentMethod, paymentNote, discountAmount = 0) {
  return await updateDoc(doc(ordersCol, id), {
    status,
    paymentMethod,
    paymentNote,
    discountAmount: parseFloat(discountAmount) || 0,
    updatedAt: serverTimestamp()
  });
}

/** Update an order's items and total */
export async function updateOrderItems(id, items, total) {
  return await updateDoc(doc(ordersCol, id), {
    items,
    total,
    updatedAt: serverTimestamp()
  });
}

/** Clear all orders */
export async function deleteAllOrders(ordersList) {
  const promises = ordersList.map((order) => deleteDoc(doc(ordersCol, order.id)));
  await Promise.all(promises);
}

// ─── SHOP SETTINGS ───────────────────────────────────────────────────────────

/** Get shop settings (open/closed, hours, contact) */
export async function getShopSettings() {
  const snap = await getDoc(settingsDoc);
  return snap.exists() ? snap.data() : null;
}

/** Subscribe to shop settings in real-time */
export function subscribeToShopSettings(callback) {
  return onSnapshot(settingsDoc, (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

/** Manually set a table's occupancy (for after payment stay) */
export async function updateTableOccupancy(tableId, isOccupied) {
  return await updateDoc(settingsDoc, {
    [`manualOccupancy.${String(tableId)}`]: isOccupied
  });
}

/** Bulk complete all orders for a table */
export async function bulkCompleteTable(orderIds, paymentData) {
  const promises = orderIds.map(id => updateDoc(doc(ordersCol, id), {
    ...paymentData,
    status: "Completed",
    completedAt: serverTimestamp()
  }));
  return Promise.all(promises);
}

/** Save shop settings */
export async function saveShopSettings(settings) {
  return await setDoc(settingsDoc, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
}

// ─── SOCIAL / CONTENT ────────────────────────────────────────────────────────

/** Get social content (quote, story, hours text) */
export async function getSocialContent() {
  const snap = await getDoc(socialDoc);
  return snap.exists() ? snap.data() : null;
}

/** Subscribe to social content in real-time */
export function subscribeToSocialContent(callback) {
  return onSnapshot(socialDoc, (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

/** Save social content */
export async function saveSocialContent(content) {
  return await setDoc(socialDoc, { ...content, updatedAt: serverTimestamp() }, { merge: true });
}

// ─── ADMIN PROFILE ──────────────────────────────────────────────────────────

/** Get admin profile for current user (display name, contact email) */
export async function getAdminProfile() {
  if (!auth.currentUser) return null;
  const snap = await getDoc(doc(usersCol, auth.currentUser.uid));
  return snap.exists() ? snap.data() : null;
}

/** Subscribe to admin profile for current user in real-time */
export function subscribeToAdminProfile(callback) {
  if (!auth.currentUser) return () => {};
  return onSnapshot(doc(usersCol, auth.currentUser.uid), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

/** Save admin profile for current user */
export async function saveAdminProfile(profile) {
  if (!auth.currentUser) return;
  return await setDoc(doc(usersCol, auth.currentUser.uid), { ...profile, updatedAt: serverTimestamp() }, { merge: true });
}

// ─── RBAC & USER ROLES ───────────────────────────────────────────────────────

/** Fetch user role from Firestore and sync basic info */
export async function getUserRole(user) {
  const uid = user.uid;
  const email = user.email;
  const superId = (import.meta.env.VITE_SUPERADMIN_UID || "").trim();
  const adminId = (import.meta.env.VITE_ADMIN_UID || "").trim();
  const currentId = (uid || "").trim();

  // Always ensure the email is stored in the user document for mapping names in logs
  const userRef = doc(usersCol, uid);
  await setDoc(userRef, { email, updatedAt: serverTimestamp() }, { merge: true });

  if (currentId === superId) return "superadmin";
  if (currentId === adminId) return "admin";

  try {
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return userDoc.data().role || "visitor";
    }
    return "visitor";
  } catch (error) {
    console.error("Error fetching user role:", error);
    return "visitor";
  }
}

/** Set system maintenance status (Kill Switch) */
export async function updateSystemMaintenance(isSiteDown) {
  return await updateDoc(settingsDoc, { isSiteDown, updatedAt: serverTimestamp() });
}

/** Reset all table occupancy states */
export async function resetAllTables() {
  return await updateDoc(settingsDoc, { manualOccupancy: {} });
}

/** Placeholder for running DB Sync (requires dbInit.js logic) */
export async function runDatabaseOrganize() {
  console.log("Database Sync Requested");
  return await updateDoc(settingsDoc, { dbSyncRequested: serverTimestamp() });
}

/** Delete orders older than X days */
export async function purgeOldOrders(days = 30) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);

  const q = query(ordersCol, where("createdAt", "<", threshold));
  const snap = await getDocs(q);

  const deletions = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletions);
  return snap.size; // Return count of deleted items
}

/** Delete orders created before a specific date */
export async function purgeOrdersBeforeDate(date) {
  const threshold = new Date(date);
  // Set to end of day to include the entire selected date
  threshold.setHours(23, 59, 59, 999);

  const q = query(ordersCol, where("createdAt", "<=", threshold));
  const snap = await getDocs(q);

  const deletions = snap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletions);
  return snap.size;
}

/** One-time migration to update category names in Firestore */
export async function migrateMenuCategories() {
  const mapping = {
    "Hot Drinks": "Hot Favorites",
    "Cold Drinks": "Cold Beverage",
  };
  const itemSpecifics = {
    "Mojito": "Cold Refreshing",
    "Blue Lagoon": "Cold Refreshing",
    "Mickey Mouse 2": "Cold Refreshing",
    "Masala(Coke/Sprite)": "Cold Refreshing",
    "Lemon Sprite": "Cold Refreshing",
    "Blue Angel": "Cold Refreshing",
    "KitKat Milkshake": "Milkshake",
    "Oreo Milkshake": "Milkshake",
    "Vanilla Milkshake": "Milkshake",
    "Chocolate Milkshake": "Milkshake",
    "Mocha Milkshake": "Milkshake",
  };

  const snap = await getDocs(menuCol);
  let count = 0;
  const batch = writeBatch(db);

  snap.docs.forEach(d => {
    const data = d.data();
    let newCat = itemSpecifics[data.name] || mapping[data.category] || data.category;
    if (newCat !== data.category) {
      batch.update(d.ref, { category: newCat });
      count++;
    }
  });

  await batch.commit();
  return count;
}

/** Fetch all registered users for role management */
export async function getAllUsers() {
  const snap = await getDocs(usersCol);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

/** Update a user's role */
export async function updateUserRole(uid, role) {
  const userRef = doc(usersCol, uid);
  return await setDoc(userRef, { role, updatedAt: serverTimestamp() }, { merge: true });
}

/** AUDIT LOGS */
const auditCol = collection(db, "auditLogs");

export async function logAuditAction(action, detail) {
  try {
    await addDoc(auditCol, {
      action,
      detail,
      timestamp: serverTimestamp(),
      user: auth.currentUser?.email || "Unknown"
    });
  } catch (err) {
    console.error("Audit logging failed:", err);
  }
}

export function subscribeToAuditLogs(callback) {
  const q = query(auditCol, orderBy("timestamp", "desc"), limit(20));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}


// ─── EXPENSES ────────────────────────────────────────────────────────────────

export async function getExpenses() {
  const q = query(expensesCol, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addExpense(expense) {
  return await addDoc(expensesCol, { ...expense, createdAt: serverTimestamp() });
}

export async function deleteExpense(id) {
  return await deleteDoc(doc(expensesCol, id));
}


// ─── DIGITAL KHATA (CREDIT LEDGER) ───────────────────────────────────────────

const khataCol = collection(db, "khata");

/**
 * Record a partial/unpaid payment for an order.
 * - Updates the order with paymentStatus and cashReceived.
 * - Creates a khata record for the customer.
 * - Atomically increments the user's totalDebt in Firestore.
 */
export async function recordKhataPayment({
  orderId,
  orderTotal,
  cashReceived,
  customerName,
  customerPhone,
  tableNum,
  adminEmail,
}) {
  const balanceDue = Math.max(0, orderTotal - cashReceived);
  const paymentStatus = cashReceived <= 0 ? "Unpaid" : balanceDue > 0 ? "Partially Paid" : "Paid";

  const batch = writeBatch(db);

  // 1. Update the order document
  const orderRef = doc(ordersCol, orderId);
  batch.update(orderRef, {
    paymentStatus,
    cashReceived: Number(cashReceived),
    balanceDue: Number(balanceDue),
    status: "Completed",
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 2. Add a khata entry
  const khataRef = doc(khataCol);
  batch.set(khataRef, {
    orderId,
    orderTotal: Number(orderTotal),
    cashReceived: Number(cashReceived),
    balanceDue: Number(balanceDue),
    paymentStatus,
    customerName: customerName || "Guest",
    customerPhone: customerPhone || "",
    tableNum: String(tableNum),
    recordedBy: adminEmail || "Admin",
    createdAt: serverTimestamp(),
  });

  await batch.commit();

  // 3. Log the audit action
  await logAuditAction(
    "Khata Recorded",
    `Rs.${balanceDue} debt for ${customerName || "Guest"} (Table ${tableNum}) recorded by ${adminEmail}`
  );

  return { balanceDue, paymentStatus };
}

/**
 * Settle a partial or full amount against a customer's outstanding khata entries.
 * Pays off oldest entries first.
 */
export async function settleKhataPayment({ customerPhone, customerName, settleAmount, adminEmail }) {
  // Find khata entries for this customer. We filter balanceDue > 0 client-side to avoid index requirements.
  let q;
  if (customerPhone) {
    q = query(khataCol, where("customerPhone", "==", customerPhone));
  } else {
    q = query(khataCol, where("customerName", "==", customerName));
  }

  const snap = await getDocs(q);
  if (snap.empty) return;

  // Filter for unpaid entries and sort oldest first client-side
  const docs = snap.docs
    .filter(d => (d.data().balanceDue || 0) > 0)
    .sort((a, b) => (a.data().createdAt?.toMillis() || 0) - (b.data().createdAt?.toMillis() || 0));

  if (docs.length === 0) return;

  let remaining = Number(settleAmount);
  const batch = writeBatch(db);

  docs.forEach((d) => {
    if (remaining <= 0) return;
    const entry = d.data();
    const toPay = Math.min(remaining, entry.balanceDue);
    const newBalance = entry.balanceDue - toPay;
    remaining -= toPay;

    batch.update(d.ref, {
      balanceDue: newBalance,
      cashReceived: entry.cashReceived + toPay,
      paymentStatus: newBalance <= 0 ? "Paid" : "Partially Paid",
      settledAt: serverTimestamp(),
    });
  });

  await batch.commit();

  await logAuditAction(
    "Khata Settled",
    `Rs.${settleAmount} settled for ${customerName || customerPhone} by ${adminEmail}`
  );
}

/**
 * Subscribe to all customers who have outstanding debt (balanceDue > 0).
 * Groups entries by customerPhone (or name) and sums totals.
 */
export function subscribeToKhataDebtors(callback) {
  // Fetch all khata records and filter client-side to bypass index requirements
  const q = query(khataCol);
  return onSnapshot(q, (snap) => {
    const entries = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter(e => (e.balanceDue || 0) > 0);
      
    // Sort client-side
    entries.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

    // Group by customerPhone or name
    const grouped = {};
    entries.forEach((e) => {
      const key = e.customerPhone || e.customerName || "Unknown";
      if (!grouped[key]) {
        grouped[key] = {
          key,
          customerName: e.customerName,
          customerPhone: e.customerPhone,
          totalDebt: 0,
          lastTransaction: e.createdAt,
          entries: [],
        };
      }
      grouped[key].totalDebt += e.balanceDue;
      grouped[key].entries.push(e);
      // Track latest transaction date
      if (e.createdAt?.toMillis() > grouped[key].lastTransaction?.toMillis()) {
        grouped[key].lastTransaction = e.createdAt;
      }
    });

    callback(Object.values(grouped).sort((a, b) => b.totalDebt - a.totalDebt));
  });
}

/** Get total outstanding debt across all customers (for Super Admin market exposure card) */
export async function getTotalMarketExposure() {
  const q = query(khataCol);
  const snap = await getDocs(q);
  return snap.docs.reduce((sum, d) => {
    const val = d.data().balanceDue || 0;
    return sum + (val > 0 ? val : 0);
  }, 0);
}

/** Subscribe to all khata entries for the audit log in Super Admin */
export function subscribeToKhataAudit(callback) {
  const q = query(khataCol, orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** Clear all audit logs (Developer Maintenance) */
export async function clearAuditLogs() {
  const snap = await getDocs(collection(db, "auditLogs"));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  return await batch.commit();
}

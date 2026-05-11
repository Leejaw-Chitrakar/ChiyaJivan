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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── COLLECTION REFS ────────────────────────────────────────────────────────
const menuCol     = collection(db, "menu");
const ordersCol   = collection(db, "orders");
const settingsDoc    = doc(db, "config", "shopSettings");
const socialDoc      = doc(db, "config", "socialContent");
const adminProfileDoc = doc(db, "config", "adminProfile");
const expensesCol    = collection(db, "expenses");
const usersCol       = collection(db, "users");

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

/** Get admin profile (display name, contact email) */
export async function getAdminProfile() {
  const snap = await getDoc(adminProfileDoc);
  return snap.exists() ? snap.data() : null;
}

/** Subscribe to admin profile in real-time */
export function subscribeToAdminProfile(callback) {
  return onSnapshot(adminProfileDoc, (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

/** Save admin profile */
export async function saveAdminProfile(profile) {
  return await setDoc(adminProfileDoc, { ...profile, updatedAt: serverTimestamp() }, { merge: true });
}

// ─── RBAC & USER ROLES ───────────────────────────────────────────────────────

/** Fetch user role from Firestore */
export async function getUserRole(uid) {
  try {
    const userDoc = await getDoc(doc(usersCol, uid));
    if (userDoc.exists()) {
      return userDoc.data().role || "admin"; // Default to admin if no role set
    }
    return "admin"; // Fallback
  } catch (error) {
    console.error("Error fetching user role:", error);
    return "admin";
  }
}

/** Set system maintenance status (Kill Switch) */
export async function updateSystemMaintenance(isSiteDown) {
  return await updateDoc(settingsDoc, { isSiteDown, updatedAt: serverTimestamp() });
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


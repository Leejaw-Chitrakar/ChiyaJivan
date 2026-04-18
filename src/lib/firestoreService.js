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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── COLLECTION REFS ────────────────────────────────────────────────────────
const menuCol     = collection(db, "menu");
const ordersCol   = collection(db, "orders");
const settingsDoc = doc(db, "config", "shopSettings");
const socialDoc   = doc(db, "config", "socialContent");

// ─── MENU ────────────────────────────────────────────────────────────────────

/** Fetch all menu items from Firestore */
export async function getMenuItems() {
  const snap = await getDocs(menuCol);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
export async function toggleMenuItemStock(id, currentStock) {
  return await updateDoc(doc(menuCol, id), { stock: !currentStock });
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

/** Subscribe to live order updates (real-time) */
export function subscribeToOrders(callback) {
  const q = query(ordersCol, orderBy("createdAt", "desc"));
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

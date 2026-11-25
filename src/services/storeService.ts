import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  AppUser,
  InventoryItem,
  MasterProduct,
  Order,
  OrderItem,
  OrderStatus,
  PricingSettings,
  UserRole,
  Workshop,
} from '../types';

export function subscribePricingSettings(callback: (settings: PricingSettings) => void) {
  return onSnapshot(doc(db, 'settings', 'pricing'), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as PricingSettings);
    } else {
      callback({ defaultMarginPercent: 0.15 });
    }
  });
}

export async function updatePricingSettings(defaultMarginPercent: number) {
  await setDoc(doc(db, 'settings', 'pricing'), { defaultMarginPercent }, { merge: true });
}

export function subscribeWorkshops(callback: (workshops: Workshop[]) => void) {
  const q = query(collection(db, 'workshops'), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Workshop));
    callback(data);
  });
}

export async function createWorkshop(data: Omit<Workshop, 'id' | 'createdAt'>) {
  await addDoc(collection(db, 'workshops'), {
    ...data,
    createdAt: Date.now(),
  });
}

export async function updateWorkshop(id: string, data: Partial<Omit<Workshop, 'id'>>) {
  await updateDoc(doc(db, 'workshops', id), data);
}

export async function deleteWorkshop(id: string) {
  await deleteDoc(doc(db, 'workshops', id));
}

export function subscribeMasterProducts(callback: (products: MasterProduct[]) => void) {
  const q = query(collection(db, 'master_products'), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MasterProduct));
    callback(data);
  });
}

export async function createMasterProduct(data: Omit<MasterProduct, 'id'>) {
  await addDoc(collection(db, 'master_products'), data);
}

export async function updateMasterProduct(id: string, data: Partial<Omit<MasterProduct, 'id'>>) {
  await updateDoc(doc(db, 'master_products', id), data);
}

export async function deleteMasterProduct(id: string) {
  await deleteDoc(doc(db, 'master_products', id));
}

export function subscribeInventory(
  callback: (items: InventoryItem[]) => void,
  workshopId?: string
) {
  const baseRef = collection(db, 'inventory_items');
  const q = workshopId ? query(baseRef, where('workshopId', '==', workshopId)) : query(baseRef);
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem));
    callback(data);
  });
}

export async function saveInventoryItem(
  data: Omit<InventoryItem, 'id' | 'updatedAt'>,
  existingId?: string
) {
  const payload = {
    ...data,
    updatedAt: Date.now(),
  };
  if (existingId) {
    await updateDoc(doc(db, 'inventory_items', existingId), payload);
  } else {
    await addDoc(collection(db, 'inventory_items'), payload);
  }
}

export async function deleteInventoryItem(id: string) {
  await deleteDoc(doc(db, 'inventory_items', id));
}

export function subscribeOrders(
  callback: (orders: Order[]) => void,
  filter?: { userId?: string; workshopId?: string }
) {
  const baseRef = collection(db, 'orders');
  let q = query(baseRef, orderBy('createdAt', 'desc'));
  if (filter?.userId) {
    q = query(baseRef, where('userId', '==', filter.userId));
  } else if (filter?.workshopId) {
    q = query(baseRef, where('workshopIds', 'array-contains', filter.workshopId));
  }
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as Order))
      .sort((a, b) => b.createdAt - a.createdAt);
    callback(data);
  });
}

export async function createOrderWithStockCheck(
  userId: string,
  userEmail: string,
  items: OrderItem[]
) {
  const total = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const workshopIds = Array.from(new Set(items.map((item) => item.workshopId)));

  await runTransaction(db, async (transaction) => {
    const itemRefs = items.map((item) => doc(db, 'inventory_items', item.inventoryItemId));
    const snapshots = await Promise.all(itemRefs.map((ref) => transaction.get(ref)));

    const currentStocks = snapshots.map((snap, idx) => {
      if (!snap.exists()) {
        throw new Error(`El item ${items[idx].productName} ya no existe.`);
      }
      const data = snap.data();
      const currentStock = Number(data?.stock ?? 0);
      if (currentStock < items[idx].quantity) {
        throw new Error(`Stock insuficiente para ${items[idx].productName}.`);
      }
      return currentStock;
    });

    currentStocks.forEach((currentStock, idx) => {
      transaction.update(itemRefs[idx], {
        stock: currentStock - items[idx].quantity,
        updatedAt: Date.now(),
      });
    });

    const newOrderRef = doc(collection(db, 'orders'));
    transaction.set(newOrderRef, {
      userId,
      userEmail,
      workshopIds,
      items,
      total,
      status: 'pendiente' as OrderStatus,
      createdAt: Date.now(),
    });
  });
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  await updateDoc(doc(db, 'orders', id), { status });
}

export function subscribeUsers(callback: (users: AppUser[]) => void) {
  return onSnapshot(collection(db, 'users'), (snapshot) => {
    const data = snapshot.docs.map((d) => {
      const raw = d.data();
      const rawRole = raw.storeRole ?? raw.role;
      const role: UserRole =
        rawRole === 'admin' || rawRole === 'taller' ? rawRole : 'usuario';

      return {
        uid: d.id,
        email: raw.email ?? '',
        displayName:
          raw.displayName ??
          raw.name ??
          (raw.email ? String(raw.email).split('@')[0] : 'Usuario'),
        role,
        workshopId: raw.workshopId ?? null,
      } as AppUser;
    });
    callback(data);
  });
}

export async function linkExistingFirebaseUser(
  uid: string,
  email: string,
  displayName: string,
  role: UserRole,
  workshopId: string | null
) {
  await setDoc(
    doc(db, 'users', uid.trim()),
    {
      uid: uid.trim(),
      email: email.trim(),
      displayName: displayName.trim(),
      role,
      storeRole: role,
      workshopId: role === 'taller' ? workshopId : null,
    },
    { merge: true }
  );
}

export async function updateUserRole(uid: string, role: UserRole, workshopId: string | null) {
  const assignedWorkshopId = role === 'taller' ? workshopId : null;
  await setDoc(
    doc(db, 'users', uid),
    {
      uid,
      role,
      storeRole: role,
      workshopId: assignedWorkshopId,
    },
    { merge: true }
  );
}
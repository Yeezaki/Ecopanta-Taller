export type UserRole = 'usuario' | 'taller' | 'admin';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  workshopId: string | null;
}

export interface Workshop {
  id: string;
  name: string;
  location: string;
  contact: string;
  active: boolean;
  createdAt: number;
}

export interface MasterProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  referencePrice: number;
  marginOverride: number | null;
  active: boolean;
}

export interface InventoryItem {
  id: string;
  workshopId: string;
  workshopName: string;
  masterProductId: string;
  price: number;
  stock: number;
  active: boolean;
  updatedAt: number;
}

export interface CartItem {
  inventoryItem: InventoryItem;
  product: MasterProduct;
  quantity: number;
}

export type OrderStatus = 'pendiente' | 'confirmado' | 'completado' | 'cancelado';

export interface OrderItem {
  inventoryItemId: string;
  masterProductId: string;
  productName: string;
  workshopId: string;
  workshopName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  workshopIds: string[];
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: number;
}

export interface PricingSettings {
  defaultMarginPercent: number;
}
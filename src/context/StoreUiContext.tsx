import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CartItem, InventoryItem, MasterProduct } from '../types';

interface StoreUiContextValue {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  cart: CartItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: MasterProduct, inventoryItem: InventoryItem) => void;
  updateCartQuantity: (inventoryItemId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const StoreUiContext = createContext<StoreUiContextValue | null>(null);

export function StoreUiProvider({ children }: { children: ReactNode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  function addToCart(product: MasterProduct, inventoryItem: InventoryItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.inventoryItem.id === inventoryItem.id);
      if (existing) {
        const nextQty = Math.min(existing.quantity + 1, inventoryItem.stock);
        return prev.map((c) =>
          c.inventoryItem.id === inventoryItem.id ? { ...c, quantity: nextQty } : c
        );
      }
      return [...prev, { product, inventoryItem, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function updateCartQuantity(inventoryItemId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((c) => c.inventoryItem.id !== inventoryItemId));
      return;
    }
    setCart((prev) =>
      prev.map((c) =>
        c.inventoryItem.id === inventoryItemId
          ? { ...c, quantity: Math.min(quantity, c.inventoryItem.stock) }
          : c
      )
    );
  }

  function clearCart() {
    setCart([]);
  }

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce(
    (acc, item) => acc + item.inventoryItem.price * item.quantity,
    0
  );

  return (
    <StoreUiContext.Provider
      value={{
        searchTerm,
        setSearchTerm,
        selectedCategory,
        setSelectedCategory,
        cart,
        cartOpen,
        setCartOpen,
        addToCart,
        updateCartQuantity,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </StoreUiContext.Provider>
  );
}

export function useStoreUi() {
  const ctx = useContext(StoreUiContext);
  if (!ctx) {
    throw new Error('useStoreUi debe utilizarse dentro de StoreUiProvider');
  }
  return ctx;
}
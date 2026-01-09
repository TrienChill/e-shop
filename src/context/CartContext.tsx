
import { randomUUID } from 'expo-crypto';
import { PropsWithChildren, createContext, useContext, useState } from 'react';
import { CartItem, Product } from '../types/types';

const COUPONS = {
  'GEMINI10': 0.1, // 10%
  'GEMINI20': 0.2, // 20%
};

interface Cart {
  items: CartItem[];
  addItem: (product: Product, size: string) => void;
  updateItemQuantity: (itemId: string, amount: -1 | 1) => void;
  removeItem: (itemId: string) => void;
  subtotal: number;
  discount: number;
  total: number;
  applyDiscount: (code: string) => boolean;
}

const CartContext = createContext<Cart>({
  items: [],
  addItem: () => {},
  updateItemQuantity: () => {},
  removeItem: () => {},
  subtotal: 0,
  discount: 0,
  total: 0,
  applyDiscount: () => false,
});

const CartProvider = ({ children }: PropsWithChildren) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discountCode, setDiscountCode] = useState<string | null>(null);

  const subtotal = items.reduce(
    (sum, item) => (sum += item.product.price * item.quantity),
    0
  );

  const discountRate = discountCode ? COUPONS[discountCode as keyof typeof COUPONS] ?? 0 : 0;
  const discount = subtotal * discountRate;
  const total = subtotal - discount;

  const addItem = (product: Product, size: string) => {
    const existingItem = items.find(
      (item) => item.product.id === product.id && item.size === size
    );

    if (existingItem) {
      updateItemQuantity(existingItem.id, 1);
      return;
    }

    const newCartItem: CartItem = {
      id: randomUUID(),
      product,
      size,
      quantity: 1,
    };

    setItems([newCartItem, ...items]);
  };

  const updateItemQuantity = (itemId: string, amount: -1 | 1) => {
    const updatedItems = items
      .map((item) =>
        item.id === itemId
          ? { ...item, quantity: item.quantity + amount }
          : item
      )
      .filter((item) => item.quantity > 0);
    setItems(updatedItems);
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };
  
  const applyDiscount = (code: string) => {
    if (COUPONS[code.toUpperCase() as keyof typeof COUPONS]) {
      setDiscountCode(code.toUpperCase());
      return true;
    }
    return false;
  }

  return (
    <CartContext.Provider value={{ items, addItem, updateItemQuantity, removeItem, subtotal, discount, total, applyDiscount }}>
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;

export const useCart = () => useContext(CartContext);


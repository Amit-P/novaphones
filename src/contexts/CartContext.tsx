import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Product } from '@/data/products';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: string;
  selectedStorage: string;
}

interface CartState {
  items: CartItem[];
  total: number;
}

// Per-order purchase limits. Accessories have no storage options; phones do.
export const MAX_PHONE_QUANTITY = 3;
export const MAX_ACCESSORY_QUANTITY = 5;
export const getMaxQuantity = (product: Product) =>
  product.storage && product.storage.length > 0 ? MAX_PHONE_QUANTITY : MAX_ACCESSORY_QUANTITY;

type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; color: string; storage: string } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' };

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, color, storage } = action.payload;
      const existingItemIndex = state.items.findIndex(
        item => item.product.id === product.id && 
                 item.selectedColor === color && 
                 item.selectedStorage === storage
      );

      let newItems;
      if (existingItemIndex >= 0) {
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: Math.min(item.quantity + 1, getMaxQuantity(item.product)) }
            : item
        );
      } else {
        newItems = [...state.items, { 
          product, 
          quantity: 1, 
          selectedColor: color, 
          selectedStorage: storage 
        }];
      }

      const total = newItems.reduce((sum, item) => sum + (((item.product.priceByStorage?.[item.selectedStorage] ?? item.product.price)) * item.quantity), 0);
      return { items: newItems, total };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => 
        `${item.product.id}-${item.selectedColor}-${item.selectedStorage}` !== action.payload
      );
      const total = newItems.reduce((sum, item) => sum + (((item.product.priceByStorage?.[item.selectedStorage] ?? item.product.price)) * item.quantity), 0);
      return { items: newItems, total };
    }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map(item =>
        `${item.product.id}-${item.selectedColor}-${item.selectedStorage}` === action.payload.id
          ? { ...item, quantity: Math.max(1, Math.min(action.payload.quantity, getMaxQuantity(item.product))) }
          : item
      );
      const total = newItems.reduce((sum, item) => sum + (((item.product.priceByStorage?.[item.selectedStorage] ?? item.product.price)) * item.quantity), 0);
      return { items: newItems, total };
    }

    case 'CLEAR_CART':
      return { items: [], total: 0 };

    default:
      return state;
  }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 });

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
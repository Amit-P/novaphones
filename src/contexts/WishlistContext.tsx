import React, { createContext, useContext, useReducer, useEffect } from 'react';

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  storage: string[];
  colors: string[];
  inStock: boolean;
}

// What's actually stored per wishlist entry — a Product plus the moment it
// was added, used by the notification feature's "still in your wishlist
// after 24h" reminder. Callers of addToWishlist() pass a plain Product; the
// reducer stamps addedAt itself so call sites don't need to know about it.
export interface WishlistItem extends Product {
  addedAt: number;
}

interface WishlistState {
  items: WishlistItem[];
}

type WishlistAction =
  | { type: 'ADD_TO_WISHLIST'; payload: Product }
  | { type: 'REMOVE_FROM_WISHLIST'; payload: string }
  | { type: 'CLEAR_WISHLIST' }
  | { type: 'LOAD_WISHLIST'; payload: WishlistItem[] };

const wishlistReducer = (state: WishlistState, action: WishlistAction): WishlistState => {
  switch (action.type) {
    case 'ADD_TO_WISHLIST':
      if (state.items.find(item => item.id === action.payload.id)) {
        return state; // Item already in wishlist
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, addedAt: Date.now() }]
      };
    
    case 'REMOVE_FROM_WISHLIST':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };
    
    case 'CLEAR_WISHLIST':
      return {
        ...state,
        items: []
      };
    
    case 'LOAD_WISHLIST':
      return {
        ...state,
        items: action.payload
      };
    
    default:
      return state;
  }
};

interface WishlistContextType {
  state: WishlistState;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  clearWishlist: () => void;
  isInWishlist: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

// Reads any previously-saved wishlist synchronously, as the reducer's actual
// initial state (React's "lazy initialization" pattern) — NOT in a useEffect.
// Loading in an effect raced against the "save on change" effect below: both
// fire on mount, and if save ran first (with the empty default state) it
// would immediately overwrite localStorage back to `[]`, wiping out whatever
// had been saved from a previous visit. Loading synchronously up front means
// there's no empty state for that effect to ever write.
const loadInitialWishlist = (): WishlistState => {
  try {
    const saved = localStorage.getItem('wishlist');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Backfill addedAt for items saved before that field existed, treating
        // them as "just added" rather than instantly flagging every pre-existing
        // item as a 24h-old reminder the moment this ships.
        return { items: parsed.map((item) => ({ addedAt: Date.now(), ...item })) };
      }
    }
  } catch (error) {
    console.error('Error loading wishlist from localStorage:', error);
  }
  return { items: [] };
};

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(wishlistReducer, undefined, loadInitialWishlist);

  // Save wishlist to localStorage whenever it changes.
  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(state.items));
  }, [state.items]);

  const addToWishlist = (product: Product) => {
    dispatch({ type: 'ADD_TO_WISHLIST', payload: product });
  };

  const removeFromWishlist = (productId: string) => {
    dispatch({ type: 'REMOVE_FROM_WISHLIST', payload: productId });
  };

  const clearWishlist = () => {
    dispatch({ type: 'CLEAR_WISHLIST' });
  };

  const isInWishlist = (productId: string) => {
    return state.items.some(item => item.id === productId);
  };

  return (
    <WishlistContext.Provider value={{
      state,
      addToWishlist,
      removeFromWishlist,
      clearWishlist,
      isInWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
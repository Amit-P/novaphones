import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import { pb } from '@/integrations/pocketbase/client';
import { products } from '@/data/products';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';

export type NotificationType =
  | 'wishlist_reminder'
  | 'wishlist_out_of_stock'
  | 'wishlist_back_in_stock'
  | 'cart_reminder'
  | 'wishlist_product_removed';

export interface AppNotification {
  id: string;
  type: NotificationType;
  productId: string;
  productName: string;
  message: string;
  createdAt: number;
  read: boolean;
}

export interface NotificationPreferences {
  enabled: boolean;
  types: Record<NotificationType, boolean>;
}

interface NotificationState {
  notifications: AppNotification[];
  // Last-observed in-stock/out-of-stock status per wishlist product id, used
  // only to detect a *transition* (so "back in stock" fires on an actual
  // change, not on every periodic check). Kept even for muted types so
  // re-enabling a type later doesn't flood in a backlog of missed events.
  stockStatus: Record<string, 'in' | 'out'>;
  preferences: NotificationPreferences;
}

type NotificationAction =
  | { type: 'ADD'; payload: AppNotification[] }
  | { type: 'UPDATE_STOCK_STATUS'; payload: Record<string, 'in' | 'out'> }
  | { type: 'MARK_READ'; payload: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'SET_PREFERENCES'; payload: NotificationPreferences };

const STORAGE_KEY = 'novaphones_notifications';
const MAX_STORED = 50;
const REMINDER_MS = 24 * 60 * 60 * 1000; // 24 hours
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  types: {
    wishlist_reminder: true,
    wishlist_out_of_stock: true,
    wishlist_back_in_stock: true,
    cart_reminder: true,
    wishlist_product_removed: true,
  },
};

// Reads any previously-saved notification state synchronously, as the
// reducer's actual initial state (the same lazy-initialization pattern used
// in WishlistContext) — never in a useEffect, which would race against a
// "save on change" effect and risk wiping storage on every mount.
const loadInitialState = (): NotificationState => {
  const fallback: NotificationState = {
    notifications: [],
    stockStatus: {},
    preferences: DEFAULT_NOTIFICATION_PREFERENCES,
  };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    return {
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      stockStatus:
        parsed.stockStatus && typeof parsed.stockStatus === 'object' ? parsed.stockStatus : {},
      preferences: {
        enabled: parsed.preferences?.enabled ?? true,
        types: { ...DEFAULT_NOTIFICATION_PREFERENCES.types, ...(parsed.preferences?.types ?? {}) },
      },
    };
  } catch (error) {
    console.error('Error loading notifications from localStorage:', error);
    return fallback;
  }
};

const notificationReducer = (
  state: NotificationState,
  action: NotificationAction
): NotificationState => {
  switch (action.type) {
    case 'ADD': {
      // Defensively dedup by id (belt-and-suspenders against React StrictMode's
      // deliberate double-invoke in dev, or any other double-fire path) —
      // the id itself already encodes "have we notified this exact event".
      const existingIds = new Set(state.notifications.map((n) => n.id));
      const deduped = action.payload.filter((n) => !existingIds.has(n.id));
      if (deduped.length === 0) return state;
      const merged = [...deduped, ...state.notifications]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, MAX_STORED);
      return { ...state, notifications: merged };
    }
    case 'UPDATE_STOCK_STATUS':
      return { ...state, stockStatus: { ...state.stockStatus, ...action.payload } };
    case 'MARK_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };
    case 'MARK_ALL_READ':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };
    case 'SET_PREFERENCES':
      return { ...state, preferences: action.payload };
    default:
      return state;
  }
};

// Label + description for each type's toggle in Account Settings.
export const NOTIFICATION_TYPE_META: Record<NotificationType, { label: string; description: string }> = {
  wishlist_reminder: {
    label: 'Wishlist reminders',
    description: 'Nudge me about items sitting in my wishlist',
  },
  wishlist_out_of_stock: {
    label: 'Wishlist out of stock',
    description: 'Tell me when a wishlist item sells out',
  },
  wishlist_back_in_stock: {
    label: 'Wishlist back in stock',
    description: 'Tell me when a wishlist item is back in stock',
  },
  cart_reminder: {
    label: 'Cart reminders',
    description: 'Remind me about items left in my cart',
  },
  wishlist_product_removed: {
    label: 'Wishlist item discontinued',
    description: 'Tell me if a wishlist item is discontinued',
  },
};

const buildMessage = (type: NotificationType, productName: string): string => {
  switch (type) {
    case 'wishlist_reminder':
      return `Still thinking it over? ${productName} is waiting in your wishlist.`;
    case 'wishlist_out_of_stock':
      return `${productName} just sold out — we'll let you know if it's back.`;
    case 'wishlist_back_in_stock':
      return `Good news! ${productName} is back in stock.`;
    case 'cart_reminder':
      return `You left ${productName} in your cart — pick up right where you left off.`;
    case 'wishlist_product_removed':
      return `${productName} has been removed from our store and is no longer available.`;
  }
};

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  preferences: NotificationPreferences;
  setEnabled: (enabled: boolean) => void;
  setTypeEnabled: (type: NotificationType, enabled: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, undefined, loadInitialState);
  const { state: wishlistState } = useWishlist();
  const { state: cartState } = useCart();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Always-fresh refs so the interval (set up once on mount) and the
  // wishlist-change effect below never act on a stale closure.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const wishlistItemsRef = useRef(wishlistState.items);
  useEffect(() => {
    wishlistItemsRef.current = wishlistState.items;
  }, [wishlistState.items]);
  const cartItemsRef = useRef(cartState.items);
  useEffect(() => {
    cartItemsRef.current = cartState.items;
  }, [cartState.items]);

  const runCheck = useCallback(async () => {
    const current = stateRef.current;
    const wishlistItems = wishlistItemsRef.current;
    const cartItems = cartItemsRef.current;
    const { preferences, stockStatus, notifications } = current;
    const now = Date.now();
    const newNotifications: AppNotification[] = [];
    const stockStatusUpdates: Record<string, 'in' | 'out'> = {};

    const typeAllowed = (t: NotificationType) => preferences.enabled && preferences.types[t];
    const hasNotification = (id: string) =>
      notifications.some((n) => n.id === id) || newNotifications.some((n) => n.id === id);
    const makeNotification = (
      id: string,
      type: NotificationType,
      productId: string,
      productName: string
    ): AppNotification => ({
      id,
      type,
      productId,
      productName,
      message: buildMessage(type, productName),
      createdAt: now,
      read: false,
    });

    // 1) Wishlist: discontinued-product check + "still in your wishlist" reminder.
    for (const item of wishlistItems) {
      const stillInCatalog = products.some((p) => p.id === item.id);

      if (!stillInCatalog) {
        const id = `removed:${item.id}`;
        if (typeAllowed('wishlist_product_removed') && !hasNotification(id)) {
          newNotifications.push(makeNotification(id, 'wishlist_product_removed', item.id, item.name));
        }
        continue; // nothing left to check stock for on a discontinued product
      }

      if (now - item.addedAt >= REMINDER_MS) {
        const id = `wishlist_reminder:${item.id}`;
        if (typeAllowed('wishlist_reminder') && !hasNotification(id)) {
          newNotifications.push(makeNotification(id, 'wishlist_reminder', item.id, item.name));
        }
      }
    }

    // 2) Cart: "left in your cart" reminder.
    for (const item of cartItems) {
      const lineId = `${item.product.id}-${item.selectedColor}-${item.selectedStorage}`;
      if (now - item.addedAt >= REMINDER_MS) {
        const id = `cart_reminder:${lineId}`;
        if (typeAllowed('cart_reminder') && !hasNotification(id)) {
          newNotifications.push(makeNotification(id, 'cart_reminder', item.product.id, item.product.name));
        }
      }
    }

    // 3) Wishlist stock transitions — needs a PocketBase round-trip, so it's
    // batched into a single query for every still-catalogued wishlist item.
    const trackableIds = wishlistItems
      .filter((item) => products.some((p) => p.id === item.id))
      .map((item) => item.id);

    if (trackableIds.length > 0) {
      try {
        const filter = trackableIds
          .map((id) => pb.filter('product_id = {:pid}', { pid: id }))
          .join(' || ');
        const records = await pb.collection('product_stock').getFullList({ filter });
        const stockByProduct: Record<string, number> = {};
        for (const r of records) stockByProduct[r.product_id as string] = r.stock as number;

        for (const item of wishlistItems) {
          if (!trackableIds.includes(item.id)) continue;
          const currentStatus: 'in' | 'out' = (stockByProduct[item.id] ?? 0) > 0 ? 'in' : 'out';
          const previousStatus = stockStatus[item.id];
          // Always recorded, even while the type is muted — see the field
          // comment on NotificationState.stockStatus.
          stockStatusUpdates[item.id] = currentStatus;

          // No previousStatus means this is the first time we've observed
          // this item (e.g. just wishlisted) — that's a baseline, not a
          // transition, so don't notify on it.
          if (previousStatus !== undefined && previousStatus !== currentStatus) {
            const type: NotificationType =
              currentStatus === 'out' ? 'wishlist_out_of_stock' : 'wishlist_back_in_stock';
            const id = `${type}:${item.id}:${now}`;
            if (typeAllowed(type)) {
              newNotifications.push(makeNotification(id, type, item.id, item.name));
            }
          }
        }
      } catch (error) {
        console.error('Error checking wishlist stock for notifications:', error);
      }
    }

    if (Object.keys(stockStatusUpdates).length > 0) {
      dispatch({ type: 'UPDATE_STOCK_STATUS', payload: stockStatusUpdates });
    }
    if (newNotifications.length > 0) {
      dispatch({ type: 'ADD', payload: newNotifications });
    }
  }, []);

  // Run once on mount, then on a recurring interval for as long as the tab
  // stays open (there's no backend push — see MIGRATION-PLAN-v2.md's "no
  // realtime" decision — so this is the mechanism that notices a 24h mark
  // passing or a background stock change while the app is open).
  useEffect(() => {
    runCheck();
    const interval = setInterval(runCheck, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [runCheck]);

  // Also re-check whenever the wishlist changes, so a freshly-added item
  // starts its reminder clock immediately rather than waiting for the next
  // interval tick. Skips the very first render — the effect above already
  // covers the initial check — so mounting doesn't run runCheck twice.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    runCheck();
  }, [wishlistState.items, runCheck]);

  const markAsRead = (id: string) => dispatch({ type: 'MARK_READ', payload: id });
  const markAllAsRead = () => dispatch({ type: 'MARK_ALL_READ' });
  const setEnabled = (enabled: boolean) =>
    dispatch({ type: 'SET_PREFERENCES', payload: { ...state.preferences, enabled } });
  const setTypeEnabled = (t: NotificationType, enabled: boolean) =>
    dispatch({
      type: 'SET_PREFERENCES',
      payload: { ...state.preferences, types: { ...state.preferences.types, [t]: enabled } },
    });

  const unreadCount = state.notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications: state.notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        preferences: state.preferences,
        setEnabled,
        setTypeEnabled,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

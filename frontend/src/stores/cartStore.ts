import { create } from "zustand";

import type { CartRead } from "../types/api";

interface CartState {
  itemCount: number;
  setItemCount: (count: number) => void;
  syncFromCart: (cart: CartRead | null | undefined) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  itemCount: 0,
  setItemCount: (count) => set({ itemCount: Math.max(count, 0) }),
  syncFromCart: (cart) =>
    set({
      itemCount: cart?.items.reduce((acc, item) => acc + item.quantity, 0) ?? 0,
    }),
  clear: () => set({ itemCount: 0 }),
}));

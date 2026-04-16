import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AuthResponse, AuthUser, TokenPair } from "../types/api";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  hasHydrated: boolean;
  setSession: (response: AuthResponse) => void;
  setUser: (user: AuthUser) => void;
  updateTokens: (tokens: TokenPair) => void;
  clearSession: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hasHydrated: false,
      setSession: (response) =>
        set({
          user: response.user,
          accessToken: response.tokens.access_token,
          refreshToken: response.tokens.refresh_token,
        }),
      setUser: (user) => set({ user }),
      updateTokens: (tokens) =>
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        }),
      clearSession: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "shopops-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

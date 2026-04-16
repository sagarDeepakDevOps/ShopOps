import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { getCart } from "../api/orders";
import { getMyProfile } from "../api/users";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";

export function useProfileSync() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const query = useQuery({
    queryKey: ["profile"],
    queryFn: getMyProfile,
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (query.data) {
      setUser({
        id: query.data.id,
        email: query.data.email,
        full_name: query.data.full_name,
        role: query.data.role,
      });
    }
  }, [query.data, setUser]);

  return query;
}

export function useCartSync() {
  const user = useAuthStore((state) => state.user);
  const syncFromCart = useCartStore((state) => state.syncFromCart);

  const query = useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (query.data) {
      syncFromCart(query.data);
    }
  }, [query.data, syncFromCart]);

  return query;
}

export function useInvalidateSessionQueries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

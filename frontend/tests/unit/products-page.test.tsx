import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { addCartItem } from "../../src/api/orders";
import { listCategories, listProducts } from "../../src/api/products";
import { ProductsPage } from "../../src/pages/ProductsPage";
import { useAuthStore } from "../../src/stores/authStore";
import { useCartStore } from "../../src/stores/cartStore";
import { renderWithProviders } from "./testUtils";

jest.mock("../../src/api/products", () => ({
  listProducts: jest.fn(),
  listCategories: jest.fn(),
}));

jest.mock("../../src/api/orders", () => ({
  addCartItem: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedListProducts = listProducts as jest.MockedFunction<typeof listProducts>;
const mockedListCategories = listCategories as jest.MockedFunction<typeof listCategories>;
const mockedAddCartItem = addCartItem as jest.MockedFunction<typeof addCartItem>;

const sampleProduct = {
  id: "product-1",
  category_id: null,
  sku: "SKU-001",
  name: "Sample Phone",
  description: "A test product",
  price: "599.99",
  stock: 5,
  category: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("Products page", () => {
  beforeEach(() => {
    mockedListProducts.mockReset();
    mockedListCategories.mockReset();
    mockedAddCartItem.mockReset();

    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      hasHydrated: true,
    });

    useCartStore.setState({ itemCount: 0 });
  });

  test("renders products from API data", async () => {
    mockedListCategories.mockResolvedValue([]);
    mockedListProducts.mockResolvedValue({
      items: [sampleProduct],
      page: 1,
      page_size: 9,
      total: 1,
    });

    renderWithProviders(<ProductsPage />, "/products");

    await waitFor(() => {
      expect(screen.getByText("Sample Phone")).toBeTruthy();
    });

    expect(screen.getByRole("button", { name: "Login to Add" })).toBeTruthy();
  });

  test("shows API failure UI state when product fetch fails", async () => {
    mockedListCategories.mockResolvedValue([]);
    mockedListProducts.mockRejectedValue(new Error("network failure"));

    renderWithProviders(<ProductsPage />, "/products");

    await waitFor(() => {
      expect(screen.getByText("Unable to load product catalog. Please try again.")).toBeTruthy();
    });
  });

  test("adds product to cart for authenticated users", async () => {
    useAuthStore.setState({
      user: {
        id: "user-1",
        email: "customer@example.com",
        full_name: "Customer User",
        role: "customer",
      },
      accessToken: "token",
      refreshToken: "refresh-token",
      hasHydrated: true,
    });

    mockedListCategories.mockResolvedValue([]);
    mockedListProducts.mockResolvedValue({
      items: [sampleProduct],
      page: 1,
      page_size: 9,
      total: 1,
    });

    mockedAddCartItem.mockResolvedValue({
      id: "cart-1",
      user_id: "user-1",
      items: [
        {
          id: "item-1",
          product_id: sampleProduct.id,
          quantity: 1,
          unit_price: sampleProduct.price,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });

    renderWithProviders(<ProductsPage />, "/products");

    await waitFor(() => {
      expect(screen.getByText("Sample Phone")).toBeTruthy();
    });

    await userEvent.click(screen.getByRole("button", { name: "Add to Cart" }));

    await waitFor(() => {
      expect(mockedAddCartItem).toHaveBeenCalledWith({ product_id: sampleProduct.id, quantity: 1 });
    });

    expect(useCartStore.getState().itemCount).toBe(1);
  });
});

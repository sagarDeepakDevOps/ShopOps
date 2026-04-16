import { expect, test } from "@playwright/test";
import { Client } from "pg";

async function promoteAdmin(email: string) {
  const client = new Client({
    host: process.env.E2E_PGHOST ?? "localhost",
    port: Number(process.env.E2E_PGPORT ?? 5433),
    user: process.env.E2E_PGUSER ?? "shopops",
    password: process.env.E2E_PGPASSWORD ?? "shopops",
    database: process.env.E2E_PGDATABASE ?? "shopops",
  });

  await client.connect();
  try {
    await client.query("UPDATE users SET role='ADMIN' WHERE email=$1", [email]);
  } finally {
    await client.end();
  }
}

test("shopops browser e2e flow", async ({ page, request }) => {
  const runId = Date.now().toString();
  const customerEmail = `ui-customer-${runId}@example.com`;
  const adminEmail = `ui-admin-${runId}@example.com`;
  const customerName = `UI Customer ${runId.slice(-4)}`;
  const adminName = `UI Admin ${runId.slice(-4)}`;
  const password = "Password123!";
  const categoryName = `UI Category ${runId.slice(-6)}`;
  const productName = `UI Phone ${runId.slice(-6)}`;
  const sku = `UI-${runId.slice(-8)}`;

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedApiResponses: string[] = [];

  page.on("console", (message) => {
    const text = message.text();
    const isExpectedUnauthorized = text.includes("401 (Unauthorized)");
    if (message.type() === "error" && !isExpectedUnauthorized) {
      consoleErrors.push(text);
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();

    const isBackendCall =
      url.includes("/api/") ||
      url.endsWith("/health") ||
      url.endsWith("/ready") ||
      url.endsWith("/metrics");

    if (!isBackendCall) {
      return;
    }

    const isExpectedInvalidLogin = url.includes("/api/v1/auth/login") && status === 401;
    if (status >= 400 && !isExpectedInvalidLogin) {
      failedApiResponses.push(`${status} ${url}`);
    }
  });

  await page.goto("/");
  await expect(page.getByText("ShopOps Control Desk")).toBeVisible();

  await page.goto("/monitoring");
  await expect(page.getByRole("heading", { name: "Operational control center" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Endpoint health checks" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "API explorer" })).toBeVisible();

  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "ShopOps Product Catalog" })).toBeVisible();

  await page.goto("/register");
  await page.getByLabel("Full name").fill(customerName);
  await page.getByLabel("Email").fill(customerEmail);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Account overview" })).toBeVisible();

  const dashboardProfileForm = page.locator("form").first();
  await dashboardProfileForm.getByLabel("Full name").fill(`${customerName} Updated`);
  await dashboardProfileForm.getByRole("button", { name: "Update profile" }).click();
  await expect(page.getByText("Profile updated")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Order history" })).toBeVisible();

  await page.getByRole("button", { name: /Logout/ }).click();
  await expect(page.getByRole("link", { name: "Login" }).first()).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(customerEmail);
  await page.getByLabel("Password").fill("WrongPass123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();

  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.getByRole("button", { name: /Logout/ }).click();

  const adminRegisterResponse = await request.post("/api/v1/auth/register", {
    data: {
      email: adminEmail,
      password,
      full_name: adminName,
    },
  });
  expect(adminRegisterResponse.ok()).toBeTruthy();

  await promoteAdmin(adminEmail);

  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Operations dashboard" })).toBeVisible();

  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Products and inventory" })).toBeVisible();

  const categoryForm = page.locator("form").nth(0);
  await categoryForm.getByPlaceholder("Category name").fill(categoryName);
  await categoryForm.getByPlaceholder("Description").fill("UI automation category");
  await categoryForm.getByRole("button", { name: "Create category" }).click();
  await expect(page.getByText("Category created")).toBeVisible();

  const productForm = page.locator("form").nth(1);
  await productForm.locator("select").first().selectOption({ label: categoryName });
  await productForm.getByPlaceholder("SKU").fill(sku);
  await productForm.getByPlaceholder("Name").fill(productName);
  await productForm.getByPlaceholder("Price").fill("599.99");
  await productForm.getByPlaceholder("Stock").fill("20");
  await productForm.getByPlaceholder("Description").fill("UI automation product");
  await productForm.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Product created")).toBeVisible();

  const inventoryRow = page.locator("tr", { hasText: productName }).first();
  await expect(inventoryRow).toBeVisible();

  await inventoryRow.getByRole("button", { name: "Edit" }).click();
  await productForm.getByPlaceholder("Stock").fill("22");
  await productForm.getByRole("button", { name: "Update" }).click();
  await expect(page.getByText("Product updated")).toBeVisible();

  await page.getByRole("button", { name: /Logout/ }).click();

  await page.goto("/products");
  await page.getByLabel("Search").fill(productName);
  const productCard = page.locator("article", { hasText: productName }).first();
  await expect(productCard).toBeVisible();
  await productCard.getByRole("link", { name: "Details" }).click();

  await expect(page.getByRole("heading", { name: productName })).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(customerEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto(`/products?search=${encodeURIComponent(productName)}`);
  const customerProductCard = page.locator("article", { hasText: productName }).first();
  await customerProductCard.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to cart")).toBeVisible();

  await page.goto("/");
  const featuredProductCard = page.locator("article", { hasText: productName }).first();
  await expect(featuredProductCard).toBeVisible();
  await featuredProductCard.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to cart")).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();

  const removeButton = page.locator('button[aria-label^="remove-"]').first();
  await expect(removeButton).toBeVisible();
  await removeButton.click({ force: true });
  await expect(page.getByText("Cart is empty")).toBeVisible();

  await page.goto(`/products?search=${encodeURIComponent(productName)}`);
  const repeatAddCard = page.locator("article", { hasText: productName }).first();
  await repeatAddCard.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to cart")).toBeVisible();
  await repeatAddCard.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByText("Added to cart")).toBeVisible();

  await page.goto("/cart");
  await page.getByLabel("Shipping address").fill("100 Market St, Austin, TX");
  await page.getByLabel("Payment outcome (for testing)").selectOption("success");
  await page.getByRole("button", { name: "Checkout" }).click();
  await expect(page.getByText("Latest payment result")).toBeVisible();
  await expect(page.getByText("success", { exact: true })).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Order history" })).toBeVisible();
  await expect(page.locator("text=Order #").first()).toBeVisible();

  await page.getByRole("button", { name: /Logout/ }).click();
  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/admin/orders");
  const firstOrderSelect = page.locator("tbody tr").first().locator("select");
  await firstOrderSelect.selectOption("shipped");
  await expect(page.getByText("Order status updated")).toBeVisible();

  await page.goto("/admin/users");
  const customerRow = page.locator("tr", { hasText: customerEmail }).first();
  await expect(customerRow).toBeVisible();
  await customerRow.getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByText("User deactivated")).toBeVisible();

  await page.goto("/admin/products");
  const rowForDeletion = page.locator("tr", { hasText: productName }).first();
  await rowForDeletion.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Product deleted")).toBeVisible();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(failedApiResponses).toEqual([]);
});

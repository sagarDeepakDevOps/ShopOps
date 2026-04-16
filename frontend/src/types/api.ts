export type UserRole = "admin" | "customer";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface AuthResponse {
  tokens: TokenPair;
  user: AuthUser;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RefreshPayload {
  refresh_token: string;
}

export interface UserRead {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserUpdatePayload {
  full_name?: string;
}

export interface AddressRead {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddressPayload {
  label: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  note?: string | null;
}

export interface CategoryRead {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryPayload {
  name: string;
  description?: string | null;
}

export interface ProductRead {
  id: string;
  category_id: string | null;
  sku: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  category: CategoryRead | null;
  created_at: string;
  updated_at: string;
}

export interface ProductPayload {
  category_id?: string | null;
  sku: string;
  name: string;
  description?: string | null;
  price: string;
  stock: number;
}

export interface ProductUpdatePayload {
  category_id?: string | null;
  sku?: string;
  name?: string;
  description?: string | null;
  price?: string;
  stock?: number;
}

export interface ProductListResponse {
  items: ProductRead[];
  page: number;
  page_size: number;
  total: number;
}

export interface ProductQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  category_id?: string;
  min_price?: string;
  max_price?: string;
  sort_by?: "created_at" | "name" | "price" | "stock";
  sort_order?: "asc" | "desc";
}

export interface CartItemRead {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  created_at: string;
}

export interface CartRead {
  id: string;
  user_id: string;
  items: CartItemRead[];
  created_at: string;
  updated_at: string;
}

export interface CartItemAddPayload {
  product_id: string;
  quantity: number;
}

export interface CheckoutPayload {
  shipping_address: string;
}

export interface OrderItemRead {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
}

export type OrderStatus = "pending" | "paid" | "failed" | "shipped" | "completed" | "cancelled";

export interface OrderRead {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount: string;
  currency: string;
  shipping_address: string;
  items: OrderItemRead[];
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = "pending" | "success" | "failed";

export interface PaymentRead {
  id: string;
  order_id: string;
  status: PaymentStatus;
  provider: string;
  amount: string;
  currency: string;
  external_ref: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessPaymentParams {
  retry?: boolean;
  force_outcome?: "auto" | "success" | "failed";
}

export interface AdminDashboard {
  total_users: number;
  total_products: number;
  total_orders: number;
  pending_orders: number;
  paid_orders: number;
}

export interface AdminOrdersParams {
  skip?: number;
  limit?: number;
}

export interface AdminUsersParams {
  skip?: number;
  limit?: number;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
}

export interface ApiValidationError {
  loc: Array<string | number>;
  msg: string;
  type: string;
}

export interface ApiErrorResponse {
  detail?: string | ApiValidationError[];
}

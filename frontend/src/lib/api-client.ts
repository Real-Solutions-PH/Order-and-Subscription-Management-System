"use client";

/**
 * API Client — thin HTTP wrapper for the PrepFlow backend.
 *
 * Every method maps 1-to-1 with a backend route and returns the parsed JSON.
 * Auth token is attached automatically when available.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";

// ---------------------------------------------------------------------------
// Token helpers
// Access token: memory-only (never persisted to storage — XSS-safe).
// Refresh token: sessionStorage (scoped to tab; cleared on browser close).
//   Full fix requires HttpOnly cookies from the backend.
// ---------------------------------------------------------------------------
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("prepflow_refresh_token");
  }
  return null;
}

export function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    sessionStorage.setItem("prepflow_refresh_token", token);
  } else {
    sessionStorage.removeItem("prepflow_refresh_token");
  }
}

export function clearTokens() {
  setAccessToken(null);
  setRefreshToken(null);
}

// ---------------------------------------------------------------------------
// Core fetch wrapper with automatic token refresh
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

function buildHeaders(options: RequestInit = {}): Record<string, string> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-ID": TENANT_ID,
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = body.detail ?? res.statusText;
    const message = Array.isArray(detail)
      ? detail
          .map((e: { msg?: string }) => e.msg ?? JSON.stringify(e))
          .join("; ")
      : String(detail);
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function retryWithToken<T>(
  path: string,
  options: RequestInit,
  newToken: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-ID": TENANT_ID,
    ...((options.headers as Record<string, string>) ?? {}),
    Authorization: `Bearer ${newToken}`,
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return handleResponse<T>(res);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = buildHeaders(options);

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Attempt token refresh on 401 (skip for auth endpoints to avoid loops)
  if (res.status === 401 && !path.startsWith("/auth/")) {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      throw new ApiError(401, "Session expired");
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const tokenRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-ID": TENANT_ID,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!tokenRes.ok) {
          throw new Error("Refresh failed");
        }
        const tokens = await tokenRes.json();
        setAccessToken(tokens.access_token);
        setRefreshToken(tokens.refresh_token);
        isRefreshing = false;
        onTokenRefreshed(tokens.access_token);
        return retryWithToken<T>(path, options, tokens.access_token);
      } catch {
        isRefreshing = false;
        refreshSubscribers = [];
        clearTokens();
        throw new ApiError(401, "Session expired");
      }
    } else {
      // Another request is already refreshing; queue this one
      return new Promise<T>((resolve, reject) => {
        refreshSubscribers.push(async (newToken) => {
          try {
            resolve(await retryWithToken<T>(path, options, newToken));
          } catch (err) {
            reject(err);
          }
        });
      });
    }
  }

  return handleResponse<T>(res);
}

function get<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
) {
  const qs = params
    ? "?" +
      new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : "";
  return request<T>(`${path}${qs}`);
}

function post<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

function patch<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

function del<T>(path: string) {
  return request<T>(path, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Type definitions (matching backend Pydantic schemas)
// ---------------------------------------------------------------------------

// Auth
export interface LoginRequest {
  email: string;
  password: string;
  tenant_slug: string;
}
export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  tenant_slug: string;
}
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
export interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_superuser: boolean;
  role: string;
  status: string;
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
}
export interface AdminUserUpdate extends UserUpdate {
  is_active?: boolean;
  role?: string;
  email?: string;
}
export interface AdminCreateUserRequest {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  password: string;
  role?: string;
}

// Ingredients
export interface IngredientResponse {
  id: string;
  tenant_id: string;
  name: string;
  default_unit: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}
export interface IngredientWithUsageResponse extends IngredientResponse {
  used_in_products: { id: string; name: string; status: string }[];
}
export interface IngredientListResponse {
  total: number;
  page: number;
  per_page: number;
  items: IngredientWithUsageResponse[];
}
export interface ProductIngredientResponse {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  ingredient: IngredientResponse;
}
export interface ProductIngredientAdd {
  name: string;
  default_unit?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}
export interface ProductIngredientUpdate {
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
}

// Products
export interface VariantResponse {
  id: string;
  name: string;
  sku: string;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  is_default: boolean;
  is_active: boolean;
  stock_quantity: number | null;
}
export interface ImageResponse {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}
export interface ProductResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  sku: string | null;
  status: string;
  is_subscribable: boolean;
  is_standalone: boolean;
  metadata: Record<string, unknown> | null;
  variants: VariantResponse[];
  images: ImageResponse[];
  ingredients: ProductIngredientResponse[];
  created_at: string;
  updated_at: string;
}
export interface ProductListResponse {
  items: ProductResponse[];
  total: number;
  page: number;
  per_page: number;
}
export interface ProductCreate {
  name: string;
  description?: string;
  short_description?: string;
  sku?: string;
  status?: string;
  is_subscribable?: boolean;
  is_standalone?: boolean;
  metadata?: Record<string, unknown>;
}
export interface ProductUpdate extends Partial<ProductCreate> {
  status?: string;
}

// Catalogs
export interface CatalogItemResponse {
  id: string;
  product_variant_id: string;
  sort_order: number;
  is_featured: boolean;
  availability_limit: number | null;
}
export interface CatalogResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  published_at: string | null;
  items: CatalogItemResponse[] | null;
  created_at: string;
}

// Subscriptions
export interface TierResponse {
  id: string;
  name: string;
  items_per_cycle: number;
  price: number;
  compare_at_price: number | null;
  is_active: boolean;
}
export interface PlanResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  billing_interval: string;
  is_active: boolean;
  tiers: TierResponse[];
  created_at: string;
}
export interface SubscriptionResponse {
  id: string;
  user_id: string;
  plan_tier: TierResponse;
  status: string;
  current_cycle_start: string;
  current_cycle_end: string;
  next_billing_date: string;
  paused_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
}
export interface CycleResponse {
  id: string;
  cycle_number: number;
  starts_at: string;
  ends_at: string;
  selection_deadline: string;
  status: string;
  selections: SelectionResponse[] | null;
}
export interface SelectionResponse {
  id: string;
  product_variant_id: string;
  quantity: number;
  customization: Record<string, unknown> | null;
}

// Cart
export interface CustomizationInput {
  key: string;
  value: string;
  price_adjustment?: number;
}
export interface CartItemResponse {
  id: string;
  product_variant_id: string;
  quantity: number;
  unit_price: number;
  customizations: CustomizationInput[];
  subtotal: number;
}
export interface CartResponse {
  id: string;
  items: CartItemResponse[];
  subtotal: number;
  item_count: number;
  promo_code: string | null;
}

// Orders
export interface OrderItemResponse {
  id: string;
  product_variant_id: string;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customizations: CustomizationInput[];
}
export interface OrderResponse {
  id: string;
  order_number: string;
  status: string;
  order_type: string;
  items: OrderItemResponse[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  delivery_fee: number;
  total: number;
  currency: string;
  notes: string | null;
  placed_at: string | null;
  confirmed_at: string | null;
  delivered_at: string | null;
  created_at: string;
}
export interface OrderListResponse {
  items: OrderResponse[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// Payments
export interface PaymentMethodResponse {
  id: string;
  type: string;
  last_four: string | null;
  display_name: string;
  card_brand: string | null;
  is_default: boolean;
}
export interface PaymentResponse {
  id: string;
  order_id: string | null;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_channel: string;
  paid_at: string | null;
  created_at: string;
}
export interface PromoCodeResponse {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
}
export interface InvoiceResponse {
  id: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  currency: string;
  issued_at: string;
  paid_at: string | null;
  pdf_url: string | null;
  line_items: {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

// Fulfillment
export interface AddressResponse {
  id: string;
  label: string;
  line_1: string;
  line_2: string | null;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  notes: string | null;
}
export interface DeliverySlotResponse {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: boolean;
}
export interface DeliveryZoneResponse {
  id: string;
  name: string;
  description: string | null;
  delivery_fee: number;
  min_order_amount: number | null;
  boundaries: Record<string, unknown> | null;
  cutoff_hours: number;
  is_active: boolean;
  slots: DeliverySlotResponse[] | null;
}
export interface FulfillmentResponse {
  id: string;
  order_id: string;
  fulfillment_type: string;
  status: string;
  scheduled_date: string;
  shipped_at: string | null;
  delivered_at: string | null;
  tracking_number: string | null;
}
export interface ProductionReportResponse {
  date: string;
  items: { product_name: string; variant_name: string; quantity: number }[];
  total_orders: number;
}

// Notifications
export interface NotificationResponse {
  id: string;
  user_id: string;
  channel: string;
  recipient: string;
  subject: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}
export interface TemplateResponse {
  id: string;
  event_type: string;
  channel: string;
  subject: string | null;
  body_template: string;
  is_active: boolean;
}

// Analytics
export interface DashboardResponse {
  total_revenue: number;
  total_orders: number;
  active_subscribers: number;
  mrr: number;
  churn_rate: number;
  aov: number;
  period: string;
}
export interface MRRBreakdown {
  total: number;
  by_plan: { plan_name: string; mrr: number; subscriber_count: number }[];
}
export interface PopularItem {
  product_name: string;
  variant_name: string;
  order_count: number;
  revenue: number;
}
export interface ChurnData {
  rate: number;
  total_cancelled: number;
  reasons: { reason: string; count: number; percentage: number }[];
}
export interface CohortResponse {
  cohort_month: string;
  months_since_signup: number;
  total_users: number;
  active_users: number;
  retention_rate: number;
  revenue: number;
}

// Tenant
export interface TenantConfigResponse {
  id: string;
  tenant_id: string;
  business_name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  timezone: string;
  currency: string;
  default_language: string;
  tax_rate: number;
  tax_label: string;
  order_cutoff_hours: number;
  max_pause_days: number;
  operating_hours: Record<string, unknown> | null;
  payment_gateways: Record<string, unknown> | null;
  notification_settings: Record<string, unknown> | null;
}

// Users (admin)
export interface UserListResponse {
  items: UserResponse[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ---------------------------------------------------------------------------
// API Methods — grouped by domain
// ---------------------------------------------------------------------------

export const api = {
  // Auth
  auth: {
    login: (data: LoginRequest) => post<TokenResponse>("/auth/login", data),
    register: (data: RegisterRequest) =>
      post<TokenResponse>("/auth/register", data),
    refresh: (refresh_token: string) =>
      post<TokenResponse>("/auth/refresh", { refresh_token }),
    logout: (refresh_token: string) =>
      post<{ message: string }>("/auth/logout", { refresh_token }),
    me: () => get<UserResponse>("/users/me"),
    updateMe: (data: UserUpdate) => patch<UserResponse>("/users/me", data),
  },

  // Users (admin)
  users: {
    list: (params?: { page?: number; page_size?: number; role?: string }) =>
      get<UserListResponse>(
        "/users",
        params as Record<string, string | number>,
      ),
    get: (id: string) => get<UserResponse>(`/users/${id}`),
    create: (data: AdminCreateUserRequest) =>
      post<UserResponse>("/users", data),
    update: (id: string, data: AdminUserUpdate) =>
      patch<UserResponse>(`/users/${id}`, data),
    activate: (id: string) =>
      patch<UserResponse>(`/users/${id}`, { is_active: true }),
    deactivate: (id: string) =>
      patch<UserResponse>(`/users/${id}`, { is_active: false }),
    delete: (id: string) => del<{ message: string }>(`/users/${id}`),
  },

  // Products
  products: {
    list: (params?: {
      skip?: number;
      limit?: number;
      page?: number;
      per_page?: number;
      status?: string;
      is_subscribable?: boolean;
      is_standalone?: boolean;
      category_id?: string;
      search?: string;
      q?: string;
    }) =>
      get<ProductListResponse>(
        "/products",
        params as Record<string, string | number>,
      ),
    get: (id: string) => get<ProductResponse>(`/products/${id}`),
    create: (data: ProductCreate) => post<ProductResponse>("/products", data),
    update: (id: string, data: ProductUpdate) =>
      patch<ProductResponse>(`/products/${id}`, data),
    delete: (id: string) => del<void>(`/products/${id}`),
    archive: (id: string) =>
      post<ProductResponse>(`/products/${id}/deactivate`),
    activate: (id: string) => post<ProductResponse>(`/products/${id}/activate`),
    deactivate: (id: string) =>
      post<ProductResponse>(`/products/${id}/deactivate`),
    addVariant: (
      productId: string,
      data: { name: string; price: number; sku?: string; is_default?: boolean },
    ) => post<VariantResponse>(`/products/${productId}/variants`, data),
    addImage: (
      productId: string,
      data: { url: string; alt_text?: string; is_primary?: boolean },
    ) => post<ImageResponse>(`/products/${productId}/images`, data),
    listIngredients: (productId: string) =>
      get<ProductIngredientResponse[]>(`/products/${productId}/ingredients`),
    addIngredient: (productId: string, data: ProductIngredientAdd) =>
      post<ProductIngredientResponse>(
        `/products/${productId}/ingredients`,
        data,
      ),
    updateIngredient: (
      productId: string,
      itemId: string,
      data: ProductIngredientUpdate,
    ) =>
      patch<ProductIngredientResponse>(
        `/products/${productId}/ingredients/${itemId}`,
        data,
      ),
    removeIngredient: (productId: string, itemId: string) =>
      del<void>(`/products/${productId}/ingredients/${itemId}`),
  },

  // Ingredients
  ingredients: {
    list: (params?: {
      page?: number;
      per_page?: number;
      search?: string;
      sort_by?: string;
      sort_dir?: string;
    }) =>
      get<IngredientListResponse>(
        "/ingredients",
        params as Record<string, string | number>,
      ),
    get: (id: string) => get<IngredientWithUsageResponse>(`/ingredients/${id}`),
  },

  // Catalogs
  catalogs: {
    create: (data: { name: string; description?: string }) =>
      post<CatalogResponse>("/catalogs", data),
    getActive: () => get<CatalogResponse>("/catalogs/active"),
    get: (id: string) => get<CatalogResponse>(`/catalogs/${id}`),
    publish: (id: string) => post<CatalogResponse>(`/catalogs/${id}/publish`),
    addItems: (
      catalogId: string,
      items: {
        product_variant_id: string;
        sort_order?: number;
        is_featured?: boolean;
      }[],
    ) => post<CatalogItemResponse[]>(`/catalogs/${catalogId}/items`, items),
    listItems: (catalogId: string) =>
      get<CatalogItemResponse[]>(`/catalogs/${catalogId}/items`),
    schedule: (
      catalogId: string,
      data: { starts_at: string; ends_at: string; recurrence_rule?: string },
    ) => post<void>(`/catalogs/${catalogId}/schedule`, data),
  },

  // Subscriptions
  subscriptions: {
    listPlans: (tenant_id: string) =>
      get<PlanResponse[]>("/subscription-plans", { tenant_id }),
    createPlan: (data: {
      name: string;
      description?: string;
      billing_interval: string;
      tiers: { name: string; items_per_cycle: number; price: number }[];
    }) => post<PlanResponse>("/subscription-plans", data),
    create: (data: { plan_tier_id: string; payment_method_id?: string }) =>
      post<SubscriptionResponse>("/subscriptions", data),
    get: (id: string) => get<SubscriptionResponse>(`/subscriptions/${id}`),
    pause: (id: string, data?: { resume_date?: string }) =>
      post<SubscriptionResponse>(`/subscriptions/${id}/pause`, data),
    resume: (id: string) =>
      post<SubscriptionResponse>(`/subscriptions/${id}/resume`),
    cancel: (id: string, data: { reason: string }) =>
      post<SubscriptionResponse>(`/subscriptions/${id}/cancel`, data),
    modifyPlan: (id: string, data: { new_plan_tier_id: string }) =>
      patch<SubscriptionResponse>(`/subscriptions/${id}/plan`, data),
    listCycles: (id: string) =>
      get<CycleResponse[]>(`/subscriptions/${id}/cycles`),
    setSelections: (
      subId: string,
      cycleId: string,
      selections: { product_variant_id: string; quantity?: number }[],
    ) =>
      post<SelectionResponse[]>(
        `/subscriptions/${subId}/cycles/${cycleId}/selections`,
        selections,
      ),
    skipCycle: (subId: string, cycleId: string) =>
      post<CycleResponse>(`/subscriptions/${subId}/cycles/${cycleId}/skip`),
  },

  // Cart
  cart: {
    get: () => get<CartResponse>("/cart"),
    addItem: (data: {
      product_variant_id: string;
      quantity: number;
      customizations?: CustomizationInput[];
    }) => post<CartResponse>("/cart/items", data),
    updateItem: (itemId: string, data: { quantity: number }) =>
      patch<CartResponse>(`/cart/items/${itemId}`, data),
    removeItem: (itemId: string) => del<CartResponse>(`/cart/items/${itemId}`),
    clear: () => del<{ message: string }>("/cart"),
    applyPromo: (code: string) => post<CartResponse>("/cart/promo", { code }),
  },

  // Orders
  orders: {
    checkout: (data: {
      delivery_address_id?: string;
      delivery_slot_id?: string;
      payment_method: string;
      promo_code?: string;
      notes?: string;
      plan_total_override?: number;
    }) => post<OrderResponse>("/orders/checkout", data),
    list: (params?: { status?: string; skip?: number; limit?: number }) =>
      get<OrderListResponse>(
        "/orders",
        params as Record<string, string | number>,
      ),
    get: (id: string) => get<OrderResponse>(`/orders/${id}`),
    updateStatus: (id: string, data: { status: string; notes?: string }) =>
      patch<OrderResponse>(`/orders/${id}/status`, data),
    cancel: (id: string, data: { reason: string }) =>
      post<OrderResponse>(`/orders/${id}/cancel`, data),
  },

  // Payments
  payments: {
    createIntent: (data: {
      order_id?: string;
      subscription_id?: string;
      amount: number;
      currency?: string;
    }) =>
      post<{
        id: string;
        amount: number;
        currency: string;
        status: string;
        client_key: string | null;
        checkout_url: string | null;
      }>("/payments/intent", data),
    attachMethod: (
      paymentId: string,
      data: { payment_method_type: string; payment_method_id?: string },
    ) => post<PaymentResponse>(`/payments/${paymentId}/attach-method`, data),
    confirm: (paymentId: string) =>
      post<PaymentResponse>(`/payments/${paymentId}/confirm`),
    get: (paymentId: string) => get<PaymentResponse>(`/payments/${paymentId}`),
    refund: (paymentId: string, amount?: number) =>
      post<PaymentResponse>(
        `/payments/${paymentId}/refund`,
        amount ? { amount } : undefined,
      ),
    createCOD: (data: { order_id: string; amount: number }) =>
      post<PaymentResponse>("/payments/cod", data),
    collectCOD: (paymentId: string) =>
      post<PaymentResponse>(`/payments/cod/${paymentId}/collect`),
    listMethods: () => get<PaymentMethodResponse[]>("/payment-methods"),
    saveMethods: (data: {
      type: string;
      display_name: string;
      paymongo_method_id?: string;
      last_four?: string;
      card_brand?: string;
    }) => post<PaymentMethodResponse>("/payment-methods", data),
    validatePromo: (data: { code: string; order_amount: number }) =>
      post<PromoCodeResponse>("/promo-codes/validate", data),
    listPromos: (params?: { skip?: number; limit?: number }) =>
      get<PromoCodeResponse[]>(
        "/promo-codes",
        params as Record<string, string | number>,
      ),
    listInvoices: (params?: { skip?: number; limit?: number }) =>
      get<InvoiceResponse[]>(
        "/invoices",
        params as Record<string, string | number>,
      ),
    getInvoice: (id: string) => get<InvoiceResponse>(`/invoices/${id}`),
  },

  // Fulfillment
  fulfillment: {
    listZones: () => get<DeliveryZoneResponse[]>("/delivery-zones"),
    createZone: (data: {
      name: string;
      delivery_fee: number;
      boundaries: Record<string, unknown>;
      cutoff_hours: number;
      description?: string;
    }) => post<DeliveryZoneResponse>("/delivery-zones", data),
    lookupZone: (postal_code: string) =>
      get<DeliveryZoneResponse | null>("/delivery-zones/lookup", {
        postal_code,
      }),
    listSlots: (params: { zone_id: string; date: string }) =>
      get<DeliverySlotResponse[]>(
        "/delivery-slots",
        params as Record<string, string>,
      ),
    getFulfillment: (id: string) =>
      get<FulfillmentResponse>(`/fulfillment/${id}`),
    updateFulfillmentStatus: (
      id: string,
      data: { status: string; notes?: string },
    ) => patch<FulfillmentResponse>(`/fulfillment/${id}/status`, data),
    getProductionReport: (date: string) =>
      get<ProductionReportResponse>(`/production-reports/${date}`),
    createAddress: (data: {
      label: string;
      line_1: string;
      line_2?: string;
      city: string;
      province: string;
      postal_code: string;
      is_default?: boolean;
      notes?: string;
    }) => post<AddressResponse>("/addresses", data),
    listAddresses: () => get<AddressResponse[]>("/addresses"),
    updateAddress: (id: string, data: Partial<AddressResponse>) =>
      patch<AddressResponse>(`/addresses/${id}`, data),
    deleteAddress: (id: string) => del<{ message: string }>(`/addresses/${id}`),
  },

  // Notifications
  notifications: {
    list: (params?: { skip?: number; limit?: number }) =>
      get<NotificationResponse[]>(
        "/notifications",
        params as Record<string, string | number>,
      ),
    send: (data: {
      user_id: string;
      channel: string;
      subject: string;
      body: string;
    }) => post<NotificationResponse>("/notifications/send", data),
    listTemplates: () => get<TemplateResponse[]>("/notification-templates"),
    createTemplate: (data: {
      event_type: string;
      channel: string;
      subject?: string;
      body_template: string;
    }) => post<TemplateResponse>("/notification-templates", data),
    updateTemplate: (
      id: string,
      data: { subject?: string; body_template?: string; is_active?: boolean },
    ) => patch<TemplateResponse>(`/notification-templates/${id}`, data),
  },

  // Analytics
  analytics: {
    dashboard: (period?: string) =>
      get<DashboardResponse>(
        "/analytics/dashboard",
        period ? { period } : undefined,
      ),
    mrr: () => get<MRRBreakdown>("/analytics/mrr"),
    churn: (params?: { period_start?: string; period_end?: string }) =>
      get<ChurnData>("/analytics/churn", params as Record<string, string>),
    popularItems: (limit?: number) =>
      get<PopularItem[]>(
        "/analytics/popular-items",
        limit ? { limit } : undefined,
      ),
    cohorts: () => get<CohortResponse[]>("/analytics/cohorts"),
  },

  // Tenant Config
  tenant: {
    getConfig: () => get<TenantConfigResponse>("/tenant/config"),
    updateConfig: (data: Partial<TenantConfigResponse>) =>
      patch<TenantConfigResponse>("/tenant/config", data),
    listFeatures: () =>
      get<{ id: string; flag_key: string; enabled: boolean }[]>(
        "/tenant/features",
      ),
    toggleFeature: (key: string, enabled: boolean) =>
      patch<{ id: string; flag_key: string; enabled: boolean }>(
        `/tenant/features/${key}`,
        { flag_key: key, enabled },
      ),
  },
} as const;

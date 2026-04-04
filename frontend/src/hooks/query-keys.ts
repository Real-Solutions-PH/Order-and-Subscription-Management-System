/**
 * Centralised query-key factory.
 * Every TanStack query/mutation in the app references keys from here so
 * invalidation is predictable and grep-able.
 */
export const queryKeys = {
  // Auth / User
  me: ['me'] as const,

  // Products & Catalog
  products: {
    all: ['products'] as const,
    list: (params?: Record<string, unknown>) => ['products', 'list', params] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
  catalogs: {
    active: ['catalogs', 'active'] as const,
    detail: (id: string) => ['catalogs', 'detail', id] as const,
    items: (id: string) => ['catalogs', 'items', id] as const,
  },

  // Subscriptions
  subscriptionPlans: ['subscription-plans'] as const,
  subscriptions: {
    detail: (id: string) => ['subscriptions', id] as const,
    cycles: (id: string) => ['subscriptions', id, 'cycles'] as const,
  },

  // Cart
  cart: ['cart'] as const,

  // Orders
  orders: {
    all: ['orders'] as const,
    list: (params?: Record<string, unknown>) => ['orders', 'list', params] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },

  // Payments
  paymentMethods: ['payment-methods'] as const,
  invoices: {
    list: (params?: Record<string, unknown>) => ['invoices', 'list', params] as const,
    detail: (id: string) => ['invoices', id] as const,
  },

  // Fulfillment
  deliveryZones: ['delivery-zones'] as const,
  deliverySlots: (zoneId: string, date: string) => ['delivery-slots', zoneId, date] as const,
  addresses: ['addresses'] as const,
  productionReport: (date: string) => ['production-report', date] as const,

  // Notifications
  notifications: {
    list: (params?: Record<string, unknown>) => ['notifications', 'list', params] as const,
  },
  notificationTemplates: ['notification-templates'] as const,

  // Analytics
  analytics: {
    dashboard: (period?: string) => ['analytics', 'dashboard', period] as const,
    mrr: ['analytics', 'mrr'] as const,
    churn: (params?: Record<string, unknown>) => ['analytics', 'churn', params] as const,
    popular: (limit?: number) => ['analytics', 'popular', limit] as const,
    cohorts: ['analytics', 'cohorts'] as const,
  },

  // Tenant
  tenantConfig: ['tenant-config'] as const,
  featureFlags: ['feature-flags'] as const,

  // Users (admin)
  users: {
    list: (params?: Record<string, unknown>) => ['users', 'list', params] as const,
    detail: (id: string) => ['users', id] as const,
  },
} as const;

export const APP_NAME = 'FleetCheck';
export const APP_VERSION = '1.0.0';

export const MISSION_STATUSES = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const MISSION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PAID: 'paid',
  CANCELLED: 'cancelled',
} as const;

export const INSPECTION_TYPES = {
  PRE_TRIP: 'pre_trip',
  POST_TRIP: 'post_trip',
  MAINTENANCE: 'maintenance',
  DAMAGE: 'damage',
} as const;

export const INSPECTION_STATUSES = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const VEHICLE_STATUSES = {
  ACTIVE: 'active',
  MAINTENANCE: 'maintenance',
  INACTIVE: 'inactive',
} as const;

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export const CREDIT_TRANSACTION_TYPES = {
  EARNED: 'earned',
  SPENT: 'spent',
  BONUS: 'bonus',
  REFUND: 'refund',
} as const;

export const CARPOOLING_STATUSES = {
  ACTIVE: 'active',
  FULL: 'full',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const ORDER_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export const COLORS = {
  primary: '#2563EB',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06B6D4',
  dark: '#0B1220',
  light: '#F3F4F6',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@fleetcheck:auth_token',
  USER_PROFILE: '@fleetcheck:user_profile',
  THEME: '@fleetcheck:theme',
  LANGUAGE: '@fleetcheck:language',
} as const;

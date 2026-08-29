
export const LOYALTY_LEVELS = {
    VIP: 'Vip',
    AVERAGE: 'Average',
    TROUBLEMAKER: 'Troublemaker',
} as const;

export type LoyaltyLevel = typeof LOYALTY_LEVELS[keyof typeof LOYALTY_LEVELS];

export const USER_ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff',
    CUSTOMER: 'customer',
    GUEST: 'guest',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

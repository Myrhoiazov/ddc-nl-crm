import type { OrderSettings } from './order.types';

// Настройки публичной продажи из окружения. Продажа выключена, пока явно не задан флаг и
// секрет токенов: неполная конфигурация не должна открывать публичный API.

const MIN_TOKEN_SECRET_LENGTH = 32;

type Env = Record<string, string | undefined>;

export interface TicketingConfig {
    salesEnabled: boolean;
    tokenSecret: string | null;
    orderSettings: Partial<OrderSettings>;
}

const readTokenSecret = (env: Env): string | null => {
    const secret = env.TICKETING_TOKEN_SECRET?.trim() ?? '';
    return secret.length >= MIN_TOKEN_SECRET_LENGTH ? secret : null;
};

const readFeeCents = (env: Env): number | undefined => {
    const fee = Number(env.TICKETING_FEE_CENTS);
    return env.TICKETING_FEE_CENTS && Number.isInteger(fee) && fee >= 0 ? fee : undefined;
};

const readOrderSettings = (env: Env): Partial<OrderSettings> => {
    const settings: Partial<OrderSettings> = {};
    const feeCents = readFeeCents(env);
    if (feeCents !== undefined) settings.feeCents = feeCents;
    if (env.TICKETING_TERMS_VERSION?.trim()) settings.termsVersion = env.TICKETING_TERMS_VERSION.trim();
    return settings;
};

export const readTicketingConfig = (env: Env = process.env): TicketingConfig => ({
    salesEnabled: env.TICKETING_SALES_ENABLED === 'true',
    tokenSecret: readTokenSecret(env),
    orderSettings: readOrderSettings(env),
});

export const isPublicSalesReady = (config: TicketingConfig): boolean => (
    config.salesEnabled && config.tokenSecret !== null
);

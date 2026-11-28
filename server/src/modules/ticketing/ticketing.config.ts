import type { OrderSettings } from './order.types';
import type { PaymentConfig } from './payment.types';
import type { TicketSmtpConfig } from './ticket-delivery.types';
import type { TicketTokenConfig } from './ticket.types';

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

const readHttpsUrl = (value: string | undefined): string | null => {
    if (!value) return null;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
    } catch {
        return null;
    }
};

export const readPaymentConfig = (env: Env = process.env): PaymentConfig | null => {
    const mode = env.TICKETING_PAYMENT_MODE ?? 'TEST';
    const returnUrl = readHttpsUrl(env.TICKETING_PAYMENT_RETURN_URL);
    const webhookUrl = readHttpsUrl(env.TICKETING_PAYMENT_WEBHOOK_URL);
    if (!returnUrl || !webhookUrl || (mode !== 'TEST' && mode !== 'LIVE')) return null;
    return { mode, returnUrl, webhookUrl };
};

export const readTicketingConfig = (env: Env = process.env): TicketingConfig => ({
    salesEnabled: env.TICKETING_SALES_ENABLED === 'true',
    tokenSecret: readTokenSecret(env),
    orderSettings: readOrderSettings(env),
});

export const isPublicSalesReady = (config: TicketingConfig): boolean => (
    config.salesEnabled && config.tokenSecret !== null
);

// Билеты подписываются отдельным секретом; пока он не задан, используется секрет токенов
// заказа. Версия хранится в билете и попадает в токен, поэтому ротация ключа не ломает старые
// подписи, если старый секрет остаётся доступным.
export const readTicketTokenConfig = (env: Env = process.env): TicketTokenConfig | null => {
    const dedicated = env.TICKETING_TICKET_TOKEN_SECRET?.trim() ?? '';
    const fallback = env.TICKETING_TOKEN_SECRET?.trim() ?? '';
    const secret = dedicated.length >= MIN_TOKEN_SECRET_LENGTH ? dedicated : fallback;
    const version = Number(env.TICKETING_TICKET_TOKEN_VERSION ?? 1);
    if (secret.length < MIN_TOKEN_SECRET_LENGTH || !Number.isInteger(version) || version < 1) return null;
    return { secret, version };
};

// Отправка билетов включается отдельно от продажи: outbox накапливается и без SMTP,
// а фоновый worker не должен отправлять письма до явного разрешения оператора.
export const isTicketEmailEnabled = (env: Env = process.env): boolean => env.TICKETING_EMAIL_ENABLED === 'true';

export const readTicketSmtpConfig = (env: Env = process.env): TicketSmtpConfig | null => {
    const host = env.SMTP_HOST?.trim() ?? '';
    const user = env.SMTP_USER?.trim() ?? '';
    const password = env.SMTP_PASSWORD ?? '';
    if (!host || !user || !password) return null;

    const configuredPort = Number(env.SMTP_PORT ?? 587);
    const port = Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65_535
        ? configuredPort
        : 587;
    return {
        host,
        port,
        secure: env.SMTP_SECURE === 'true' || port === 465,
        user,
        password,
        from: env.SMTP_FROM?.trim() || user,
    };
};

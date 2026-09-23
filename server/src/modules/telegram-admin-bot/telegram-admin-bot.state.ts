// Per-admin conversation state for multi-step Telegram flows (create student, subscription,
// payment link, ...). Same Redis-if-configured/in-memory-fallback convention as
// auth/auth.rate-limit.service.ts, so this feature behaves the same way in every environment
// that already runs the rest of the app. State is scoped per Telegram user id, so concurrent
// admins (including inside the same group chat) never see or overwrite each other's flow.

export interface AdminBotFlowState {
    flow: string;
    step: string;
    // Shape depends on `flow` (e.g. CreateStudentData for 'student-create') — the service layer
    // casts on read, same as any other per-flow payload store.
    data: unknown;
    chatId: string | number;
    messageId?: number;
}

const TTL_MS = 15 * 60 * 1000; // stale flows expire after 15 minutes of inactivity

interface StoredState {
    state: AdminBotFlowState;
    expiresAt: number;
}

const memoryStore = new Map<string, StoredState>();

type RedisClient = {
    connect: () => Promise<unknown>;
    isOpen: boolean;
    set: (key: string, value: string, options?: { PX: number }) => Promise<unknown>;
    get: (key: string) => Promise<string | null>;
    del: (key: string) => Promise<unknown>;
    on: (event: 'error', listener: (error: Error) => void) => unknown;
};

let redisClientPromise: Promise<RedisClient | null> | null = null;
let redisDisabled = false;

const redisUrl = () => process.env.REDIS_URL?.trim();
const storeKey = (telegramUserId: string) => `telegram-admin-bot:flow:${telegramUserId}`;

const getRedisClient = async (): Promise<RedisClient | null> => {
    const url = redisUrl();
    if (!url || redisDisabled) return null;

    if (!redisClientPromise) {
        redisClientPromise = import('redis')
            .then(async ({ createClient }) => {
                const client = createClient({ url }) as RedisClient;
                client.on('error', (error) => {
                    console.error('Redis telegram-admin-bot state client error:', error);
                });
                await client.connect();
                return client;
            })
            .catch((error): null => {
                redisDisabled = true;
                console.error('Redis telegram-admin-bot state unavailable, falling back to in-memory store:', error);
                return null;
            });
    }

    const client = await redisClientPromise;
    return client?.isOpen ? client : null;
};

const removeExpiredMemoryEntries = (now: number) => {
    if (memoryStore.size < 1000) return;
    memoryStore.forEach((entry, key) => {
        if (entry.expiresAt <= now) memoryStore.delete(key);
    });
};

export const getFlowState = async (telegramUserId: string): Promise<AdminBotFlowState | null> => {
    const client = await getRedisClient();
    if (client) {
        try {
            const raw = await client.get(storeKey(telegramUserId));
            return raw ? JSON.parse(raw) as AdminBotFlowState : null;
        } catch (error) {
            console.error('Redis telegram-admin-bot state read failed, falling back to in-memory store:', error);
        }
    }

    const now = Date.now();
    removeExpiredMemoryEntries(now);
    const entry = memoryStore.get(telegramUserId);
    if (!entry || entry.expiresAt <= now) return null;
    return entry.state;
};

export const setFlowState = async (telegramUserId: string, state: AdminBotFlowState): Promise<void> => {
    const client = await getRedisClient();
    if (client) {
        try {
            await client.set(storeKey(telegramUserId), JSON.stringify(state), { PX: TTL_MS });
            return;
        } catch (error) {
            console.error('Redis telegram-admin-bot state write failed, falling back to in-memory store:', error);
        }
    }
    memoryStore.set(telegramUserId, { state, expiresAt: Date.now() + TTL_MS });
};

export const clearFlowState = async (telegramUserId: string): Promise<void> => {
    memoryStore.delete(telegramUserId);
    const client = await getRedisClient();
    if (!client) return;
    try {
        await client.del(storeKey(telegramUserId));
    } catch (error) {
        console.error('Redis telegram-admin-bot state clear failed:', error);
    }
};

export const hasActiveFlow = async (telegramUserId: string): Promise<boolean> => Boolean(await getFlowState(telegramUserId));

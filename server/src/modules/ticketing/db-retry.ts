// Повтор транзакций инвентаря при взаимной блокировке или таймауте ожидания блокировки
// (MySQL 1213/1205, Prisma P2034). Любая другая ошибка пробрасывается сразу.

export interface LockRetryOptions {
    attempts?: number;
    sleep?: (ms: number) => Promise<void>;
    random?: () => number;
}

const RETRYABLE_MESSAGE = /deadlock|lock wait timeout|write conflict/i;
const MIN_BACKOFF_MS = 20;
const BACKOFF_SPREAD_MS = 80;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

export const isRetryableLockError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') return false;
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (code === 'P2034') return true;
    return typeof message === 'string' && RETRYABLE_MESSAGE.test(message);
};

export const withLockRetry = async <T>(
    operation: () => Promise<T>,
    { attempts = 3, sleep = defaultSleep, random = Math.random }: LockRetryOptions = {},
): Promise<T> => {
    for (let attempt = 1; ; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            if (attempt >= attempts || !isRetryableLockError(error)) throw error;
            // Джиттер разводит повторно столкнувшиеся транзакции во времени.
            await sleep(MIN_BACKOFF_MS + Math.floor(random() * BACKOFF_SPREAD_MS));
        }
    }
};

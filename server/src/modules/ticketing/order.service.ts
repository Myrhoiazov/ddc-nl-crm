import { randomBytes, randomUUID } from 'crypto';
import { withLockRetry } from './db-retry';
import { deriveOrderAccessToken, hashTicketingToken } from './hold-token';
import { formatOrderNumber, ORDER_NUMBER_RANDOM_BYTES, resolveOrderSettings } from './order.policy';
import {
    convertHoldToOrder,
    findOrderByAccessTokenHash,
    isOrderNumberCollision,
    type ConvertHoldOutcome,
    type ConvertHoldParams,
} from './order.repository';
import type { CreateOrderInput, CreateOrderResult, OrderServiceDeps, OrderSummary } from './order.types';

const NUMBER_ATTEMPTS = 3;

const currentTime = (deps: OrderServiceDeps) => (deps.now ? deps.now() : new Date());

// Случайный номер может совпасть с существующим: транзакция откатывается целиком, hold остаётся
// ACTIVE, и попытка повторяется с новым номером.
const convertWithFreshNumber = async (
    deps: OrderServiceDeps,
    params: Omit<ConvertHoldParams, 'number'>,
): Promise<ConvertHoldOutcome> => {
    for (let attempt = 1; ; attempt += 1) {
        const number = formatOrderNumber(randomBytes(ORDER_NUMBER_RANDOM_BYTES));
        try {
            return await convertHoldToOrder(deps.prisma, { ...params, number });
        } catch (error) {
            if (attempt >= NUMBER_ATTEMPTS || !isOrderNumberCollision(error)) throw error;
        }
    }
};

// Checkout: удержанные места становятся заказом, ожидающим оплаты. Состав и сумма берутся
// из hold и инвентаря; повтор с тем же токеном hold возвращает тот же заказ.
export const createOrder = async (deps: OrderServiceDeps, input: CreateOrderInput): Promise<CreateOrderResult> => {
    const accessToken = deriveOrderAccessToken(deps.tokenSecret, input.holdToken);
    const params = {
        tokenHash: hashTicketingToken(input.holdToken),
        accessTokenHash: hashTicketingToken(accessToken),
        idempotencyKey: randomUUID(),
        buyer: input.buyer,
        settings: resolveOrderSettings(deps.settings),
        now: currentTime(deps),
    };
    const outcome = await withLockRetry(() => convertWithFreshNumber(deps, params), { sleep: deps.sleep });

    if (outcome.kind === 'rejected') return outcome;
    return { kind: outcome.kind, order: outcome.order, accessToken };
};

// Доступ к заказу — только по токену покупателя; номер заказа сам по себе ничего не открывает.
export const getOrderByAccessToken = (deps: OrderServiceDeps, accessToken: string): Promise<OrderSummary | null> => (
    findOrderByAccessTokenHash(deps.prisma, hashTicketingToken(accessToken))
);

import { withLockRetry } from './db-retry';
import { hashClientIp, hashTicketingToken, resolveHoldToken } from './hold-token';
import { checkSeatSelection, computeHoldExpiry, isHoldLive } from './hold.policy';
import type {
    CreateHoldInput,
    CreateHoldResult,
    HoldRecord,
    HoldServiceDeps,
} from './ticketing.types';

const currentTime = (deps: HoldServiceDeps) => (deps.now ? deps.now() : new Date());

// Повтор с тем же requestKey: живой hold возвращается как есть, завершённый — отказ,
// чтобы старый ключ не мог «оживить» уже освобождённые места.
const replayExistingHold = (existing: HoldRecord, holdToken: string, now: Date): CreateHoldResult => (
    isHoldLive(existing, now)
        ? { kind: 'held', holdToken, expiresAt: existing.expiresAt, seatIds: existing.seatIds }
        : { kind: 'rejected', reason: 'REQUEST_KEY_REUSED' }
);

// Два одновременных запроса с одним requestKey: проигравший получает hold победителя.
const replayConcurrentHold = async (
    deps: HoldServiceDeps,
    { holdToken, tokenHash, now }: { holdToken: string; tokenHash: string; now: Date },
): Promise<CreateHoldResult> => {
    const winner = await deps.repository.findHoldByTokenHash(tokenHash);
    return winner
        ? replayExistingHold(winner, holdToken, now)
        : { kind: 'rejected', reason: 'REQUEST_KEY_REUSED' };
};

// Удерживает все запрошенные места или ни одного (docs/ticketing/DATABASE_DESIGN.md §5.1).
export const createHold = async (deps: HoldServiceDeps, input: CreateHoldInput): Promise<CreateHoldResult> => {
    const now = currentTime(deps);
    const session = await deps.repository.findSession(input.sessionId);
    const selection = checkSeatSelection(session, input.seatIds, now);
    if (selection.kind === 'rejected') return selection;

    const holdToken = resolveHoldToken(deps.tokenSecret, input.sessionId, input.requestKey);
    const tokenHash = hashTicketingToken(holdToken);
    const existing = input.requestKey ? await deps.repository.findHoldByTokenHash(tokenHash) : null;
    if (existing) return replayExistingHold(existing, holdToken, now);

    const outcome = await withLockRetry(() => deps.repository.holdSeats({
        sessionId: input.sessionId,
        seatIds: selection.seatIds,
        tokenHash,
        expiresAt: computeHoldExpiry(session, now),
        clientIpHash: hashClientIp(deps.tokenSecret, input.clientIp),
    }), { sleep: deps.sleep });

    if (outcome.kind === 'unavailable') return outcome;
    if (outcome.kind === 'duplicate') return replayConcurrentHold(deps, { holdToken, tokenHash, now });
    return { kind: 'held', holdToken, expiresAt: outcome.hold.expiresAt, seatIds: outcome.hold.seatIds };
};

// Явный отказ покупателя: возвращает false, если hold уже не активен (повтор безвреден).
export const releaseHold = async (deps: HoldServiceDeps, holdToken: string): Promise<boolean> => (
    withLockRetry(
        () => deps.repository.releaseHold(hashTicketingToken(holdToken), currentTime(deps)),
        { sleep: deps.sleep },
    )
);

export interface ExpireHoldsResult {
    expired: number;
    skipped: number;
}

// Фоновая задача: каждый hold истекает собственной транзакцией с условным переходом,
// поэтому повторный или параллельный запуск ничего не ломает.
export const expireDueHolds = async (deps: HoldServiceDeps, limit = 200): Promise<ExpireHoldsResult> => {
    const now = currentTime(deps);
    const holdIds = await deps.repository.findExpiredHoldIds(now, limit);
    const result: ExpireHoldsResult = { expired: 0, skipped: 0 };

    for (const holdId of holdIds) {
        const expired = await withLockRetry(() => deps.repository.expireHold(holdId, now), { sleep: deps.sleep });
        if (expired) result.expired += 1;
        else result.skipped += 1;
    }

    return result;
};

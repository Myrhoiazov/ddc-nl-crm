import type { ManualSessionStatus, SessionPriceInput } from './event.schema';

// Чистые правила событий и сеансов: без I/O.

const SLUG_MAX_LENGTH = 80;

// Латиница и цифры из названия; кириллическое название даёт пустую основу — тогда «event».
// Суффикс делает слаг уникальным и неугадываемым для черновиков.
export const buildEventSlug = (title: string, suffix: string): string => {
    const base = title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, SLUG_MAX_LENGTH);
    return `${base || 'event'}-${suffix}`;
};

export type PriceCoverage =
    | { kind: 'ok' }
    | { kind: 'mismatch'; missingCategoryIds: number[]; unknownCategoryIds: number[] };

// Цена обязана быть ровно у каждой категории схемы: без пропусков, чужих и повторов.
export const checkPriceCoverage = (categoryIds: number[], prices: SessionPriceInput[]): PriceCoverage => {
    const priced = prices.map((price) => price.categoryId);
    const missingCategoryIds = categoryIds.filter((id) => !priced.includes(id));
    const unknownCategoryIds = priced.filter((id, index) => !categoryIds.includes(id) || priced.indexOf(id) !== index);
    return missingCategoryIds.length + unknownCategoryIds.length === 0
        ? { kind: 'ok' }
        : { kind: 'mismatch', missingCategoryIds, unknownCategoryIds };
};

export const isSalesWindowValid = (window: { startsAt: Date; salesStartAt: Date | null; salesEndAt: Date | null }): boolean => {
    const { startsAt, salesStartAt, salesEndAt } = window;
    if (salesStartAt && salesEndAt && salesStartAt.getTime() >= salesEndAt.getTime()) return false;
    return !salesStartAt || salesStartAt.getTime() < startsAt.getTime();
};

// Ручные переходы статуса сеанса. Публикация (DRAFT -> ON_SALE) — отдельная операция с
// генерацией инвентаря; CLOSED и CANCELLED обратно не открываются.
const ALLOWED_FROM: Record<ManualSessionStatus, ManualSessionStatus[]> = {
    ON_SALE: ['PAUSED'],
    PAUSED: ['ON_SALE'],
    CLOSED: ['ON_SALE', 'PAUSED'],
};

export const allowedSourceStatuses = (target: ManualSessionStatus): ManualSessionStatus[] => ALLOWED_FROM[target];

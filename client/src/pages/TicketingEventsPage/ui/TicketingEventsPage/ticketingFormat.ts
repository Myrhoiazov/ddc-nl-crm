// Форматирование и разбор значений форм страницы событий — чистые функции.

export const formatMoney = (cents: number, currency: string) => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
}).format(cents / 100);

export const formatDateTime = (iso: string) => new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
}).format(new Date(iso));

// «25», «25,5», «25.50» -> центы; пустое или некорректное значение -> null.
export const parsePriceToCents = (value: string): number | null => {
    const normalized = value.trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
    return Math.round(Number(normalized) * 100);
};

// Значение <input type="datetime-local"> трактуется как местное время браузера.
export const localInputToIso = (value: string): string | null => {
    const date = new Date(value);
    return value && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
};

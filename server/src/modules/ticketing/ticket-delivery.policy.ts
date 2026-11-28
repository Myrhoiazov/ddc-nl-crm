import { TicketDeliveryStatus } from '@prisma/client';
import type { TicketDeliveryEmail, TicketDeliveryRetry } from './ticket-delivery.types';
import type { TicketBundle } from './ticket.types';

// Чистые правила outbox: задержки повторов и содержимое письма. Никакого I/O и доступа к БД,
// поэтому поведение проверяется напрямую, без SMTP и MySQL.

// Первая попытка + три повтора. Лимит защищает от бесконечных попыток при постоянной ошибке.
export const MAX_TICKET_DELIVERY_ATTEMPTS = 4;
const MIN_RETRY_DELAY_MS = 60_000;
const MAX_RETRY_DELAY_MS = 24 * 60 * 60 * 1000;

export const ticketDeliveryRetryDelayMs = (attempts: number): number => (
    Math.min(MIN_RETRY_DELAY_MS * 2 ** Math.max(0, attempts - 1), MAX_RETRY_DELAY_MS)
);

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const ticketDeliveryRetry = (attempts: number, now: Date, error: unknown): TicketDeliveryRetry => {
    const status = attempts >= MAX_TICKET_DELIVERY_ATTEMPTS
        ? TicketDeliveryStatus.FAILED
        : TicketDeliveryStatus.PENDING;
    const nextAttemptAt = status === TicketDeliveryStatus.FAILED
        ? now
        : new Date(now.getTime() + ticketDeliveryRetryDelayMs(attempts));
    return { status, nextAttemptAt, lastError: errorMessage(error) };
};

const escapeHtml = (value: unknown): string => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const seatLines = (bundle: TicketBundle): string[] => bundle.tickets.map((ticket, index) => {
    const seat = ticket.seat;
    const label = [seat.sectionLabel, `Row ${seat.rowLabel}`, `Seat ${seat.seatLabel}`, seat.categoryName]
        .filter(Boolean).join(' · ');
    return `${index + 1}. ${label}`;
});

// Токен билета уходит только внутри вложения-PDF. В теле письма его нет: письмо может быть
// переслано, а короткий код и хеш в БД не являются секретом для получателя.
export const ticketDeliveryEmail = (bundle: TicketBundle): TicketDeliveryEmail => {
    const subject = `Your tickets for ${bundle.event.title}`;
    const seats = seatLines(bundle);
    const venue = [bundle.event.venueName, bundle.event.venueCity].filter(Boolean).join(', ');
    const text = [
        'Hello,',
        '',
        `Your tickets for ${bundle.event.title} (order ${bundle.orderNumber}) are attached.`,
        `${venue} · ${bundle.event.startsAt}`,
        '',
        ...seats,
        '',
        'Show the QR code from the PDF at the entrance.',
    ].join('\n');
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#1d1d33">
        <h2>${escapeHtml(subject)}</h2>
        <p>Your tickets for <strong>${escapeHtml(bundle.event.title)}</strong> are attached.</p>
        <p>Order: ${escapeHtml(bundle.orderNumber)}<br>${escapeHtml(venue)} · ${escapeHtml(bundle.event.startsAt)}</p>
        <ol>${seats.map((seat) => `<li>${escapeHtml(seat)}</li>`).join('')}</ol>
        <p style="color:#6b7280;font-size:12px">Show the QR code from the PDF at the entrance.</p>
    </div>
`;
    return { subject, text, html, attachmentName: `tickets-${bundle.orderNumber}.pdf` };
};

import axios from 'axios';

type MoneyValue = string | number | { toString(): string };

interface MolliePaymentNotification {
    mollieId: string;
    status: string;
    amountValue: MoneyValue;
    amountCurrency: string;
    refundedAmount: MoneyValue;
    chargedBackAmount: MoneyValue;
    description?: string | null;
    method?: string | null;
    paidAt?: Date | null;
    consumerName?: string | null;
    customer?: {
        payerName?: string | null;
        givenName?: string | null;
        familyName?: string | null;
        email?: string | null;
        client?: {
            firstName?: string | null;
            lastName?: string | null;
            email?: string | null;
        } | null;
        clientLinks?: Array<{
            client?: {
                firstName?: string | null;
                lastName?: string | null;
                email?: string | null;
            } | null;
        }>;
    } | null;
    invoice?: {
        number: string;
        billToName?: string | null;
    } | null;
}

const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const money = (value: MoneyValue, currency: string) => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
}).format(Number(value));

const payerName = (payment: MolliePaymentNotification) => (
    payment.consumerName
    || payment.customer?.payerName
    || [payment.customer?.givenName, payment.customer?.familyName].filter(Boolean).join(' ')
    || payment.customer?.email
    || 'Неизвестный плательщик'
);

const clientName = (client?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
} | null) => (
    [client?.firstName, client?.lastName].filter(Boolean).join(' ')
    || client?.email
    || null
);

const studentNames = (payment: MolliePaymentNotification) => {
    const names = [
        payment.invoice?.billToName,
        clientName(payment.customer?.client),
        ...(payment.customer?.clientLinks?.map((link) => clientName(link.client)) ?? []),
    ].filter((value): value is string => Boolean(value));

    return Array.from(new Set(names)).join(', ') || null;
};

const statusLabel: Record<string, string> = {
    paid: 'Оплачен',
    failed: 'Ошибка',
    canceled: 'Отменён',
    cancelled: 'Отменён',
    expired: 'Истёк',
    charged_back: 'Chargeback',
    chargeback: 'Chargeback',
    pending: 'Ожидает',
    open: 'Открыт',
};

const notificationTitle = (payment: MolliePaymentNotification) => {
    if (Number(payment.chargedBackAmount) > 0 || payment.status === 'charged_back') return 'Chargeback по платежу';
    if (Number(payment.refundedAmount) > 0) return 'Возврат по платежу';
    if (payment.status === 'paid') return 'Успешная оплата';
    if (payment.status === 'failed') return 'Платёж завершился ошибкой';
    if (payment.status === 'canceled' || payment.status === 'cancelled') return 'Платёж отменён';
    if (payment.status === 'expired') return 'Срок платежа истёк';
    return null;
};

export const isTelegramConfigured = () => Boolean(
    process.env.TELEGRAM_TOKEN && process.env.TELEGRAM_CHAT_ID,
);

export const buildMolliePaymentNotification = (payment: MolliePaymentNotification) => {
    const title = notificationTitle(payment);
    if (!title) return null;
    const students = studentNames(payment);

    const rows = [
        `<b>${escapeHtml(title)}</b>`,
        '',
        `<b>Кто оплатил:</b> ${escapeHtml(payerName(payment))}`,
        students ? `<b>За кого:</b> ${escapeHtml(students)}` : null,
        `<b>Сумма:</b> ${escapeHtml(money(payment.amountValue, payment.amountCurrency))}`,
        `<b>Статус:</b> ${escapeHtml(statusLabel[payment.status] ?? payment.status)}`,
        '',
        payment.customer?.email ? `<b>Email:</b> ${escapeHtml(payment.customer.email)}` : null,
        payment.description ? `<b>Описание:</b> ${escapeHtml(payment.description)}` : null,
        payment.invoice?.number ? `<b>Инвойс:</b> ${escapeHtml(payment.invoice.number)}` : null,
        `<b>Mollie:</b> <code>${escapeHtml(payment.mollieId)}</code>`,
        payment.method ? `<b>Метод:</b> ${escapeHtml(payment.method)}` : null,
        payment.paidAt ? `<b>Оплачено:</b> ${escapeHtml(payment.paidAt.toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' }))}` : null,
        Number(payment.refundedAmount) > 0
            ? `<b>Возвращено:</b> ${escapeHtml(money(payment.refundedAmount, payment.amountCurrency))}`
            : null,
        Number(payment.chargedBackAmount) > 0
            ? `<b>Chargeback:</b> ${escapeHtml(money(payment.chargedBackAmount, payment.amountCurrency))}`
            : null,
    ].filter(Boolean);

    return rows.join('\n');
};

export const sendTelegramMessage = async (text: string) => {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
        throw new Error('Telegram is not configured. Set TELEGRAM_TOKEN and TELEGRAM_CHAT_ID.');
    }

    await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
        },
        { timeout: 8_000 },
    );
};

export const notifyMolliePayment = async (payment: MolliePaymentNotification) => {
    const message = buildMolliePaymentNotification(payment);
    if (!message || !isTelegramConfigured()) return false;
    await sendTelegramMessage(message);
    return true;
};

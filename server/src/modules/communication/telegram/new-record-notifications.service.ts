import { canSendNotification, escapeHtml, sendTelegramMessage } from './telegram.service';
import { TELEGRAM_NOTIFICATION_KEYS } from './notification-settings.types';

// Above this many new Mollie customers in one sync run the group gets a single summary instead
// of one message per customer — a first import would otherwise flood the chat.
const MAX_INDIVIDUAL_CUSTOMER_NOTIFICATIONS = 3;

export type NewStudentSource = 'CRM' | 'TELEGRAM_MINIAPP';
export type NewMollieCustomerSource = 'CRM' | 'MOLLIE_SYNC';

export interface NewStudentNotification {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    branchName?: string | null;
    createdByEmail?: string | null;
    source: NewStudentSource;
}

export interface NewMollieCustomerNotification {
    id: number;
    name?: string | null;
    source: NewMollieCustomerSource;
    linkedToStudent: boolean;
}

const studentSourceLabel: Record<NewStudentSource, string> = {
    CRM: 'CRM',
    TELEGRAM_MINIAPP: 'Telegram Mini App',
};

const customerSourceLabel: Record<NewMollieCustomerSource, string> = {
    CRM: 'создан в CRM',
    MOLLIE_SYNC: 'синхронизация с Mollie',
};

// The messages go to a group chat, so they carry a link into the CRM instead of contact
// details. No link when CLIENT_URL is unset (local development).
const crmLink = (path: string, label: string) => {
    const base = process.env.CLIENT_URL?.replace(/\/+$/, '');
    return base ? `<a href="${escapeHtml(`${base}${path}`)}">${escapeHtml(label)}</a>` : null;
};

const joinRows = (rows: Array<string | null>) => rows.filter((row): row is string => row !== null).join('\n');

export const buildNewStudentNotification = (student: NewStudentNotification) => joinRows([
    '<b>Новый ученик</b>',
    '',
    `<b>Имя:</b> ${escapeHtml([student.firstName, student.lastName].filter(Boolean).join(' ') || 'Без имени')}`,
    student.branchName ? `<b>Филиал:</b> ${escapeHtml(student.branchName)}` : null,
    `<b>Источник:</b> ${studentSourceLabel[student.source]}`,
    student.createdByEmail ? `<b>Создал:</b> ${escapeHtml(student.createdByEmail)}` : null,
    crmLink(`/clients/${student.id}`, 'Открыть карточку'),
]);

export const buildNewMollieCustomerNotification = (customer: NewMollieCustomerNotification) => joinRows([
    '<b>Новый клиент Mollie</b>',
    '',
    `<b>Имя:</b> ${escapeHtml(customer.name?.trim() || 'Без имени')}`,
    `<b>Источник:</b> ${customerSourceLabel[customer.source]}`,
    `<b>Ученик:</b> ${customer.linkedToStudent ? 'привязан' : 'не привязан'}`,
    crmLink(`/mollie/customers/${customer.id}`, 'Открыть карточку'),
]);

export const buildNewMollieCustomersSummaryNotification = (count: number) => joinRows([
    '<b>Новые клиенты Mollie</b>',
    '',
    `<b>Добавлено при синхронизации:</b> ${count}`,
    crmLink('/mollie/customers', 'Открыть список'),
]);

export const notifyNewStudent = async (student: NewStudentNotification) => {
    if (!(await canSendNotification(TELEGRAM_NOTIFICATION_KEYS.NEW_STUDENT))) return false;
    await sendTelegramMessage(buildNewStudentNotification(student));
    return true;
};

const buildNewMollieCustomerMessages = (customers: NewMollieCustomerNotification[]) => (
    customers.length > MAX_INDIVIDUAL_CUSTOMER_NOTIFICATIONS
        ? [buildNewMollieCustomersSummaryNotification(customers.length)]
        : customers.map(buildNewMollieCustomerNotification)
);

export const notifyNewMollieCustomers = async (customers: NewMollieCustomerNotification[]) => {
    if (!customers.length || !(await canSendNotification(TELEGRAM_NOTIFICATION_KEYS.NEW_MOLLIE_CUSTOMER))) return false;
    for (const message of buildNewMollieCustomerMessages(customers)) {
        await sendTelegramMessage(message);
    }
    return true;
};

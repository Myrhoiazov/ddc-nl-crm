// Pure step logic for the guided "new student" flow — kept free of Telegram/DB I/O so it can be
// unit-tested directly. The actual write goes through clients.service.ts's createClient +
// clients.controller.ts's createClientSchema (both reused as-is, spec §9: "do not invent a
// separate Telegram-specific student schema").

export interface CreateStudentData {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
}

export type ParsedNameInput = { firstName: string; lastName?: string } | { error: string };

export const parseNameInput = (text: string): ParsedNameInput => {
    const trimmed = text.trim();
    if (!trimmed) return { error: 'Имя не может быть пустым. Введите имя и фамилию ученика.' };
    const [firstName, ...rest] = trimmed.split(/\s+/);
    const lastName = rest.join(' ') || undefined;
    return { firstName, lastName };
};

// "-" is the guided-flow's explicit skip token for the optional phone/email steps.
export const parseSkippableInput = (text: string): string | undefined => {
    const trimmed = text.trim();
    return trimmed === '-' || trimmed === '' ? undefined : trimmed;
};

const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const buildCreateStudentConfirmText = (data: CreateStudentData): string => [
    '<b>Проверьте данные ученика:</b>',
    '',
    `Имя: ${escapeHtml([data.firstName, data.lastName].filter(Boolean).join(' '))}`,
    `Телефон: ${data.phoneNumber ? escapeHtml(data.phoneNumber) : '—'}`,
    `Email: ${data.email ? escapeHtml(data.email) : '—'}`,
].join('\n');

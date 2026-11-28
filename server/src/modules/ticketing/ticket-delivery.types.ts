import type { PrismaClient, TicketDeliveryStatus } from '@prisma/client';
import type { TicketTokenConfig } from './ticket.types';

// Контракт доставки билетов: воркер, SMTP-адаптер и cron зависят от этих типов, а не друг от друга.

export interface TicketSmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
}

export interface TicketMailAttachment {
    filename: string;
    content: Buffer;
    contentType: 'application/pdf';
}

export interface TicketMailMessage {
    to: string;
    subject: string;
    text: string;
    html: string;
    attachments: TicketMailAttachment[];
}

export interface TicketMailer {
    send(message: TicketMailMessage): Promise<void>;
}

export interface TicketDeliveryDeps {
    prisma: PrismaClient;
    tokens: TicketTokenConfig | null;
    // Отправка разрешена только явным флагом, даже если worker вызван не из cron.
    enabled: boolean;
    // null означает отсутствие SMTP-конфигурации: воркер не захватывает строки outbox.
    mailer: TicketMailer | null;
    // Секрет токенов заказа и адрес страницы заказа нужны только письмам восстановления;
    // без них строки RECOVERY_LINK остаются в outbox нетронутыми.
    recoveryTokenSecret?: string | null;
    orderUrl?: string | null;
}

export interface TicketDeliveryCommandDeps {
    prisma: PrismaClient;
    tokenSecret: string;
}

// Повторной отправке секрет не нужен: она не меняет токен доступа к заказу.
export type TicketResendDeps = Pick<TicketDeliveryCommandDeps, 'prisma'>;

export interface RecoveryDeliveryInput {
    orderNumber: string;
    email: string;
}

export interface ResendDeliveryInput {
    orderId: number;
    actorId: number;
}

export interface TicketDeliveryResult {
    claimed: number;
    sent: number;
    failed: number;
}

export interface TicketDeliveryRetry {
    status: TicketDeliveryStatus;
    nextAttemptAt: Date;
    lastError: string;
}

export interface TicketDeliveryEmail {
    subject: string;
    text: string;
    html: string;
    // У восстановления нет вложения: токен живёт только во фрагменте ссылки.
    attachmentName?: string;
}

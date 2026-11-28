import nodemailer from 'nodemailer';
import type { TicketMailer, TicketSmtpConfig } from './ticket-delivery.types';

// Отдельный SMTP-адаптер для билетов: минует CRM-почту и не создаёт EmailMessage.
// Конфигурация приходит из окружения через ticketing.config.ts, а не из почтовых аккаунтов CRM.
export const createTicketSmtpMailer = (config: TicketSmtpConfig): TicketMailer => {
    const transport = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.user, pass: config.password },
    });

    return {
        async send(message) {
            await transport.sendMail({
                from: config.from,
                to: message.to,
                subject: message.subject,
                text: message.text,
                html: message.html,
                attachments: message.attachments,
            });
        },
    };
};

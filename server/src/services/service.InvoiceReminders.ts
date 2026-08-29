import cron from 'node-cron';
import { sendDueInvoiceReminders } from './service.InvoiceDelivery';

export const startInvoiceReminderCron = () => {
    cron.schedule('0 9 * * *', async () => {
        console.log('[Cron] Sending invoice reminders...');
        await sendDueInvoiceReminders();
    });
};

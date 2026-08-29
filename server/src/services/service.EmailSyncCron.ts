import cron from 'node-cron';
import prisma from '../../prisma/prisma-client';
import { logger } from '../logger';
import { syncEmailAccount } from './service.EmailImap';

// Every 5 minutes, per account, so one slow/broken mailbox connection can't
// delay or block syncing the others.
export const syncAllActiveEmailAccounts = async () => {
    const accounts = await prisma.emailAccount.findMany({
        where: { isActive: true },
        select: { id: true, label: true },
    });

    for (const account of accounts) {
        try {
            const result = await syncEmailAccount(account.id);
            logger.info(`[EmailSyncCron] Synced "${account.label}" (id=${account.id}): created=${result.created}, errors=${result.errors}`);
        } catch (error) {
            logger.error(`[EmailSyncCron] Failed to sync "${account.label}" (id=${account.id}): ${error}`);
        }
    }
};

export const startEmailSyncCron = () => {
    cron.schedule('*/5 * * * *', async () => {
        await syncAllActiveEmailAccounts();
    });
};

import { ImapFlow } from 'imapflow';
import { simpleParser, Attachment as ParsedAttachment } from 'mailparser';
import prisma from '../../prisma/prisma-client';
import { logger } from '../logger';
import { decryptEmailSecret } from './service.EmailCrypto';
import { storeAttachmentFile } from './service.EmailAttachmentStorage';

export { ATTACHMENTS_DIR } from './service.EmailAttachmentStorage';

const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024;

interface ImapConnectionConfig {
    imapHost: string;
    imapPort: number;
    imapSecure: boolean;
    username: string;
    password: string;
}

interface SyncResult {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
}

const buildImapClient = (config: ImapConnectionConfig) => new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: config.imapSecure,
    auth: {
        user: config.username,
        pass: config.password,
    },
    logger: false,
    // A hung/black-holed host would otherwise sit on the default 90s timeout —
    // with the manual "Sync" button and the 5-minute cron both able to hit the
    // same account, a stuck connection compounds fast if we don't fail sooner.
    connectionTimeout: 20_000,
});

// logout() itself can hang or reject (e.g. the socket already dropped) — letting
// that escape a `finally` would replace whatever real error caused the sync to
// fail in the first place, and the caller would never see it.
const safeLogout = async (client: ImapFlow) => {
    try {
        await client.logout();
    } catch (error) {
        logger.error(`IMAP logout failed (connection likely already closed): ${error}`);
    }
};

// Verifies IMAP credentials work before we save them, so a typo doesn't get
// silently stored and only surface as a confusing failure on next sync.
export const verifyImapConnection = async (config: ImapConnectionConfig) => {
    const client = buildImapClient(config);

    await client.connect();
    await safeLogout(client);
};

export const addressesToJson = (addresses?: { address?: string; name?: string }[] | null) =>
    (addresses ?? [])
        .filter((address) => address.address)
        .map((address) => ({ address: address.address, name: address.name }));

// MySQL's default collation (utf8mb4_unicode_ci) already compares case-insensitively,
// unlike Postgres where Prisma needs an explicit `mode: 'insensitive'` filter option.
const findClientIdByAddress = async (fromAddress: string): Promise<number | null> => {
    const client = await prisma.client.findFirst({
        where: { email: fromAddress },
        select: { id: true },
    });

    return client?.id ?? null;
};

// `related` attachments are inline images referenced via cid: in the HTML body
// (e.g. a logo in someone's signature) — not files the sender actually attached,
// so we don't want them cluttering the attachments list.
const saveAttachments = async (messageDbId: number, attachments: ParsedAttachment[]) => {
    const realAttachments = attachments.filter((attachment) => !attachment.related);

    await Promise.all(realAttachments.map((attachment) => {
        if (attachment.size > MAX_ATTACHMENT_SIZE) {
            logger.error(`Skipping oversized attachment "${attachment.filename}" (${attachment.size} bytes) for message=${messageDbId}`);
            return undefined;
        }

        return storeAttachmentFile(messageDbId, {
            filename: attachment.filename ?? 'attachment',
            mimeType: attachment.contentType,
            buffer: attachment.content,
        });
    }));
};

// The cron tick (every 5 minutes) and a manual "Sync" click can land on the
// same account at the same time — both would read the same `lastSyncedUid`,
// fetch overlapping ranges, and race to write it back, silently rolling it
// backward. This process runs as a single instance (no horizontal scaling),
// so a plain in-memory guard is enough; a second caller just gets a clear
// "already syncing" error instead of a corrupted cursor.
const accountsCurrentlySyncing = new Set<number>();

export const syncEmailAccount = async (accountId: number): Promise<SyncResult> => {
    if (accountsCurrentlySyncing.has(accountId)) {
        throw new Error('Этот ящик уже синхронизируется — подождите завершения текущей синхронизации');
    }
    accountsCurrentlySyncing.add(accountId);

    try {
        return await syncEmailAccountUnguarded(accountId);
    } finally {
        accountsCurrentlySyncing.delete(accountId);
    }
};

const syncEmailAccountUnguarded = async (accountId: number): Promise<SyncResult> => {
    const result: SyncResult = { created: 0, updated: 0, skipped: 0, errors: 0 };

    const account = await prisma.emailAccount.findUnique({ where: { id: accountId } });

    if (!account || !account.isActive) {
        throw new Error('Email account not found or inactive');
    }

    const client = buildImapClient({
        imapHost: account.imapHost,
        imapPort: account.imapPort,
        imapSecure: account.imapSecure,
        username: account.username,
        password: decryptEmailSecret(account.passwordEncrypted),
    });

    await client.connect();

    try {
        const mailbox = await client.mailboxOpen('INBOX');
        const startUid = (account.lastSyncedUid ?? 0) + 1;

        if (mailbox.uidNext <= startUid) {
            return result;
        }

        let highestUid = account.lastSyncedUid ?? 0;

        for await (const message of client.fetch(
            `${startUid}:*`,
            { envelope: true, source: true },
            { uid: true },
        )) {
            if (message.uid < startUid) {
                // The server can include the boundary message again; skip anything
                // we've already synced.
                continue;
            }

            try {
                const parsed = message.source ? await simpleParser(message.source) : undefined;
                const fromAddress = message.envelope?.from?.[0]?.address ?? parsed?.from?.value?.[0]?.address ?? '';

                if (!fromAddress) {
                    result.skipped += 1;
                    continue;
                }

                const clientId = await findClientIdByAddress(fromAddress);

                const savedMessage = await prisma.emailMessage.upsert({
                    where: {
                        mailboxId_imapUid: {
                            mailboxId: account.id,
                            imapUid: message.uid,
                        },
                    },
                    create: {
                        mailboxId: account.id,
                        imapUid: message.uid,
                        messageId: message.envelope?.messageId ?? undefined,
                        inReplyToMessageId: message.envelope?.inReplyTo ?? undefined,
                        fromAddress,
                        fromName: message.envelope?.from?.[0]?.name ?? undefined,
                        toAddresses: addressesToJson(message.envelope?.to),
                        ccAddresses: addressesToJson(message.envelope?.cc),
                        subject: message.envelope?.subject ?? undefined,
                        bodyText: parsed?.text ?? undefined,
                        bodyHtml: typeof parsed?.html === 'string' ? parsed.html : undefined,
                        receivedAt: message.envelope?.date ?? new Date(),
                        clientId: clientId ?? undefined,
                    },
                    update: {},
                });

                if (parsed?.attachments?.length) {
                    await saveAttachments(savedMessage.id, parsed.attachments);
                }

                result.created += 1;
                highestUid = Math.max(highestUid, message.uid);
            } catch (error) {
                logger.error(`Failed to sync email uid=${message.uid} for account=${account.id}: ${error}`);
                result.errors += 1;
            }
        }

        await prisma.emailAccount.update({
            where: { id: account.id },
            data: { lastSyncedUid: highestUid, lastSyncedAt: new Date() },
        });
    } finally {
        await safeLogout(client);
    }

    return result;
};

// Used for both "delete" (move to the account's trash folder) and "mark as
// spam" (move to the account's spam folder) — IMAP MOVE (with imapflow's
// automatic COPY+EXPUNGE fallback for servers that don't support the MOVE
// extension) rather than an outright \Deleted+expunge, so a message the user
// removes by mistake is still recoverable from the mailbox's own Trash/Junk
// folder via any regular mail client.
export const moveMessageOnServer = async (accountId: number, imapUid: number, destinationFolder: string) => {
    const account = await prisma.emailAccount.findUnique({ where: { id: accountId } });

    if (!account) {
        throw new Error('Email account not found');
    }

    const client = buildImapClient({
        imapHost: account.imapHost,
        imapPort: account.imapPort,
        imapSecure: account.imapSecure,
        username: account.username,
        password: decryptEmailSecret(account.passwordEncrypted),
    });

    await client.connect();

    try {
        await client.mailboxOpen('INBOX');
        const result = await client.messageMove([imapUid], destinationFolder, { uid: true });

        if (!result) {
            throw new Error(`IMAP server rejected moving uid=${imapUid} to "${destinationFolder}" (does that folder exist?)`);
        }
    } finally {
        await safeLogout(client);
    }
};

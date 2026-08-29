import { memo, useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input/Input';
import { classNames } from '@/shared/lib/classNames/classNames';
import { HStack, VStack } from '@/shared/ui/Stack';
import { getUserAuthData } from '@/entities/User';
import { RoleKey } from '@/entities/Role';
import {
    createEmailAccount,
    CreateEmailAccountPayload,
    deleteEmailAccount,
    EmailAccount,
    fetchEmailAccounts,
    syncEmailAccount as syncEmailAccountApi,
} from '@/entities/EmailAccount';
import {
    deleteEmailMessage,
    EmailMessage,
    EmailMessageDetail,
    EmailMessageList,
    fetchEmailMessage,
    fetchEmailMessages,
    markEmailMessageAsSpam,
    replyToEmailMessage,
    SendEmailPayload,
    sendEmailMessage,
} from '@/entities/EmailMessage';
import { EMAIL_MESSAGES_UPDATED_EVENT } from '@/shared/const/events';
import { EmailAccountsPanel } from '../EmailAccountsPanel/EmailAccountsPanel';
import { ComposeEmailModal } from '../ComposeEmailModal/ComposeEmailModal';
import cls from './EmailPage.module.scss';

// Lets the Navbar's unread-email badge refetch immediately instead of waiting
// for its own poll interval, any time this page changes read/unread state.
const notifyEmailMessagesUpdated = () => {
    window.dispatchEvent(new Event(EMAIL_MESSAGES_UPDATED_EVENT));
};

type EmailTab = 'accounts' | 'messages';

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

const EmailPage = memo(() => {
    const { t } = useTranslation();
    const authData = useSelector(getUserAuthData);
    const isAdmin = authData?.role === RoleKey.ADMIN;

    const [activeTab, setActiveTab] = useState<EmailTab>('messages');

    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [selectedMailboxId, setSelectedMailboxId] = useState<number>();
    const [syncingAccountId, setSyncingAccountId] = useState<number>();

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');

    const [messages, setMessages] = useState<EmailMessage[]>([]);
    const [totalMessages, setTotalMessages] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<EmailMessage>();
    const [isSendingReply, setIsSendingReply] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isMarkingAsSpam, setIsMarkingAsSpam] = useState(false);

    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [isSendingCompose, setIsSendingCompose] = useState(false);

    const loadAccounts = useCallback(async () => {
        setAccounts(await fetchEmailAccounts());
    }, []);

    // `append: false` replaces the list (new filter/search or a fresh reload after
    // sync/send); `append: true` is "Загрузить ещё" — adds the next page on top of
    // what's already shown instead of resetting scroll position.
    const loadMessages = useCallback(async (targetPage: number, append: boolean) => {
        (append ? setIsLoadingMore : setIsLoadingMessages)(true);
        try {
            const { items, total } = await fetchEmailMessages({
                mailboxId: selectedMailboxId,
                search: search || undefined,
                page: targetPage,
                limit: PAGE_SIZE,
            });
            setMessages((prev) => (append ? [...prev, ...items] : items));
            setTotalMessages(total);
            setPage(targetPage);
        } finally {
            (append ? setIsLoadingMore : setIsLoadingMessages)(false);
        }
    }, [selectedMailboxId, search]);

    const reloadMessages = useCallback(() => loadMessages(1, false), [loadMessages]);

    const onLoadMore = useCallback(() => {
        loadMessages(page + 1, true);
    }, [loadMessages, page]);

    useEffect(() => {
        if (isAdmin) {
            loadAccounts();
        }
    }, [isAdmin, loadAccounts]);

    // Debounce typing so we don't fire a search request on every keystroke.
    useEffect(() => {
        const handle = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(handle);
    }, [searchInput]);

    // Message data only matters while the "Письма" tab is visible — no point fetching
    // it while the user is busy managing mailbox connections on the other tab.
    useEffect(() => {
        if (isAdmin && activeTab === 'messages') {
            reloadMessages();
            setSelectedMessage(undefined);
        }
    }, [isAdmin, activeTab, reloadMessages]);

    // Returns undefined on success, or the server's actual error message on failure —
    // surfacing it lets the user tell "IMAP unreachable" apart from "SMTP host is empty".
    const onCreateAccount = useCallback(async (payload: CreateEmailAccountPayload) => {
        try {
            await createEmailAccount(payload);
            await loadAccounts();
            return undefined;
        } catch (error) {
            if (axios.isAxiosError(error) && typeof error.response?.data?.message === 'string') {
                return error.response.data.message as string;
            }
            return 'Не удалось подключить ящик';
        }
    }, [loadAccounts]);

    const onDeleteAccount = useCallback(async (accountId: number) => {
        if (!window.confirm('Отключить этот почтовый ящик? Синхронизированные письма останутся в истории.')) {
            return;
        }
        await deleteEmailAccount(accountId);
        if (selectedMailboxId === accountId) {
            setSelectedMailboxId(undefined);
        }
        await loadAccounts();
    }, [loadAccounts, selectedMailboxId]);

    const onSyncAccount = useCallback(async (accountId: number) => {
        setSyncingAccountId(accountId);
        try {
            await syncEmailAccountApi(accountId);
            await loadAccounts();
            await reloadMessages();
            notifyEmailMessagesUpdated();
        } finally {
            setSyncingAccountId(undefined);
        }
    }, [loadAccounts, reloadMessages]);

    const onSelectMessage = useCallback(async (message: EmailMessage) => {
        const fullMessage = await fetchEmailMessage(message.id);
        setSelectedMessage(fullMessage);
        setMessages((prev) => prev.map((item) => (item.id === message.id ? { ...item, isRead: true } : item)));
        notifyEmailMessagesUpdated();
    }, []);

    const onReply = useCallback(async (html: string, files?: File[]) => {
        if (!selectedMessage) {
            return false;
        }

        setIsSendingReply(true);
        try {
            await replyToEmailMessage(selectedMessage.id, html, files);
            await reloadMessages();
            return true;
        } catch {
            return false;
        } finally {
            setIsSendingReply(false);
        }
    }, [selectedMessage, reloadMessages]);

    const onDeleteMessage = useCallback(async () => {
        if (!selectedMessage) {
            return;
        }

        setIsDeleting(true);
        try {
            await deleteEmailMessage(selectedMessage.id);
            setSelectedMessage(undefined);
            await reloadMessages();
            notifyEmailMessagesUpdated();
            toast.success('Письмо удалено');
        } catch {
            toast.error('Не удалось удалить письмо');
        } finally {
            setIsDeleting(false);
        }
    }, [selectedMessage, reloadMessages]);

    const onMarkMessageAsSpam = useCallback(async () => {
        if (!selectedMessage) {
            return;
        }

        setIsMarkingAsSpam(true);
        try {
            await markEmailMessageAsSpam(selectedMessage.id);
            setSelectedMessage(undefined);
            await reloadMessages();
            notifyEmailMessagesUpdated();
            toast.success('Письмо помечено как спам');
        } catch {
            toast.error('Не удалось пометить письмо как спам');
        } finally {
            setIsMarkingAsSpam(false);
        }
    }, [selectedMessage, reloadMessages]);

    const onSendCompose = useCallback(async (payload: SendEmailPayload) => {
        setIsSendingCompose(true);
        try {
            await sendEmailMessage(payload);
            await reloadMessages();
            return true;
        } catch {
            return false;
        } finally {
            setIsSendingCompose(false);
        }
    }, [reloadMessages]);

    if (!isAdmin) {
        return (
            <Page>
                <Text title="Доступ запрещён" text="Модуль почты доступен только администраторам." size="m" bold />
            </Page>
        );
    }

    const tabs: { key: EmailTab; label: string }[] = [
        { key: 'accounts', label: t('Аккаунты') },
        { key: 'messages', label: t('Письма') },
    ];

    const hasMore = messages.length < totalMessages;

    return (
        <Page>
            <VStack gap="16" max className={cls.EmailPage}>
                <HStack justify="between" align="center" max>
                    <Text title="Почта" size="l" bold />
                    <Button
                        theme={ButtonTheme.BACKGROUND_INVERTED}
                        disabled={!accounts.length}
                        onClick={() => setIsComposeOpen(true)}
                    >
                        {t('Написать письмо')}
                    </Button>
                </HStack>

                <div className={cls.tabBar} role="tablist">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.key}
                            className={classNames(cls.tab, { [cls.tabActive]: activeTab === tab.key })}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'accounts' && (
                    <EmailAccountsPanel
                        accounts={accounts}
                        syncingAccountId={syncingAccountId}
                        onSync={onSyncAccount}
                        onDelete={onDeleteAccount}
                        onCreate={onCreateAccount}
                    />
                )}

                {activeTab === 'messages' && (
                    <VStack gap="8" max>
                        <HStack gap="16" align="center" max wrap="wrap">
                            <div className={cls.mailboxFilter}>
                                <button
                                    type="button"
                                    className={classNames(cls.filterChip, { [cls.filterChipActive]: selectedMailboxId === undefined })}
                                    onClick={() => setSelectedMailboxId(undefined)}
                                >
                                    {t('Все ящики')}
                                </button>
                                {accounts.map((account) => (
                                    <button
                                        key={account.id}
                                        type="button"
                                        className={classNames(cls.filterChip, { [cls.filterChipActive]: selectedMailboxId === account.id })}
                                        onClick={() => setSelectedMailboxId(account.id)}
                                    >
                                        {account.label}
                                    </button>
                                ))}
                            </div>

                            <Input
                                size="s"
                                placeholder={t('Поиск по теме, отправителю, тексту...')}
                                value={searchInput}
                                onChange={setSearchInput}
                                className={cls.searchInput}
                            />
                        </HStack>

                        <HStack gap="16" align="start" max className={cls.layout}>
                            <Card padding="0" shadow="shadowLight" className={cls.messageColumn}>
                                <EmailMessageList
                                    messages={messages}
                                    selectedMessageId={selectedMessage?.id}
                                    isLoading={isLoadingMessages}
                                    onSelect={onSelectMessage}
                                />
                                {!isLoadingMessages && hasMore && (
                                    <div className={cls.loadMore}>
                                        <Button
                                            theme={ButtonTheme.OUTLINE}
                                            disabled={isLoadingMore}
                                            onClick={onLoadMore}
                                        >
                                            {isLoadingMore ? t('Загрузка...') : t('Загрузить ещё')}
                                        </Button>
                                    </div>
                                )}
                            </Card>

                            {selectedMessage ? (
                                <EmailMessageDetail
                                    message={selectedMessage}
                                    isSendingReply={isSendingReply}
                                    isDeleting={isDeleting}
                                    isMarkingAsSpam={isMarkingAsSpam}
                                    onReply={onReply}
                                    onDelete={onDeleteMessage}
                                    onMarkAsSpam={onMarkMessageAsSpam}
                                />
                            ) : (
                                <Card padding="24" shadow="shadowLight" className={cls.emptyState}>
                                    <Text text="Выберите письмо, чтобы просмотреть его" size="s" />
                                </Card>
                            )}
                        </HStack>
                    </VStack>
                )}
            </VStack>

            <ComposeEmailModal
                isOpen={isComposeOpen}
                accounts={accounts}
                isSending={isSendingCompose}
                onClose={() => setIsComposeOpen(false)}
                onSend={onSendCompose}
            />
        </Page>
    );
});

export default EmailPage;

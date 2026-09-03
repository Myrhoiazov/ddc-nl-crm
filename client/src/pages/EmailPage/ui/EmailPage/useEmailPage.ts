import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
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
    fetchEmailMessage,
    fetchEmailMessages,
    markEmailMessageAsSpam,
    replyToEmailMessage,
    SendEmailPayload,
    sendEmailMessage,
} from '@/entities/EmailMessage';
import { EMAIL_MESSAGES_UPDATED_EVENT } from '@/shared/const/events';

// Lets the Navbar's unread-email badge refetch immediately instead of waiting
// for its own poll interval, any time this page changes read/unread state.
const notifyEmailMessagesUpdated = () => {
    window.dispatchEvent(new Event(EMAIL_MESSAGES_UPDATED_EVENT));
};

export type EmailTab = 'accounts' | 'messages';

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export const useEmailPage = () => {
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

    const hasMore = messages.length < totalMessages;

    return {
        isAdmin,
        activeTab, setActiveTab,
        accounts,
        selectedMailboxId, setSelectedMailboxId,
        syncingAccountId,
        searchInput, setSearchInput,
        messages,
        isLoadingMessages,
        isLoadingMore,
        selectedMessage,
        isSendingReply,
        isDeleting,
        isMarkingAsSpam,
        isComposeOpen, setIsComposeOpen,
        isSendingCompose,
        hasMore,
        onCreateAccount,
        onDeleteAccount,
        onSyncAccount,
        onSelectMessage,
        onReply,
        onDeleteMessage,
        onMarkMessageAsSpam,
        onSendCompose,
        onLoadMore,
    };
};

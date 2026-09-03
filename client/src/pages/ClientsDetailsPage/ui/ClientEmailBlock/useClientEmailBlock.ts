import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
    deleteEmailMessage,
    EmailMessage,
    fetchEmailMessage,
    fetchEmailMessages,
    markEmailMessageAsSpam,
    replyToEmailMessage,
} from '@/entities/EmailMessage';
import { EMAIL_MESSAGES_UPDATED_EVENT } from '@/shared/const/events';

// Lets the Navbar's unread-email badge refetch immediately instead of waiting
// for its own poll interval, any time this block changes read/unread state.
const notifyEmailMessagesUpdated = () => {
    window.dispatchEvent(new Event(EMAIL_MESSAGES_UPDATED_EVENT));
};

const PAGE_SIZE = 25;

export const useClientEmailBlock = (clientId: number, isAdmin: boolean) => {
    const [messages, setMessages] = useState<EmailMessage[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<EmailMessage>();
    const [isSendingReply, setIsSendingReply] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isMarkingAsSpam, setIsMarkingAsSpam] = useState(false);

    const loadMessages = useCallback(async (targetPage: number, append: boolean) => {
        (append ? setIsLoadingMore : setIsLoading)(true);
        try {
            const { items, total: newTotal } = await fetchEmailMessages({
                clientId,
                page: targetPage,
                limit: PAGE_SIZE,
            });
            setMessages((prev) => (append ? [...prev, ...items] : items));
            setTotal(newTotal);
            setPage(targetPage);
        } finally {
            (append ? setIsLoadingMore : setIsLoading)(false);
        }
    }, [clientId]);

    const reloadMessages = useCallback(() => loadMessages(1, false), [loadMessages]);

    const onLoadMore = useCallback(() => {
        loadMessages(page + 1, true);
    }, [loadMessages, page]);

    useEffect(() => {
        if (isAdmin && clientId) {
            reloadMessages();
        }
    }, [isAdmin, clientId, reloadMessages]);

    const onSelectMessage = useCallback(async (message: EmailMessage) => {
        setSelectedMessage(await fetchEmailMessage(message.id));
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

    return {
        messages,
        total,
        isLoading,
        isLoadingMore,
        selectedMessage,
        isSendingReply,
        isDeleting,
        isMarkingAsSpam,
        onLoadMore,
        onSelectMessage,
        onReply,
        onDeleteMessage,
        onMarkMessageAsSpam,
    };
};

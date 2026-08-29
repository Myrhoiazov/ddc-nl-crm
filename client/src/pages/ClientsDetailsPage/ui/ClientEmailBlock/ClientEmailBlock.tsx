import { memo, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { HStack, VStack } from '@/shared/ui/Stack';
import { getUserAuthData } from '@/entities/User';
import { RoleKey } from '@/entities/Role';
import {
    deleteEmailMessage,
    EmailMessage,
    EmailMessageDetail,
    EmailMessageList,
    fetchEmailMessage,
    fetchEmailMessages,
    markEmailMessageAsSpam,
    replyToEmailMessage,
} from '@/entities/EmailMessage';
import { EMAIL_MESSAGES_UPDATED_EVENT } from '@/shared/const/events';
import s from './ClientEmailBlock.module.scss';

// Lets the Navbar's unread-email badge refetch immediately instead of waiting
// for its own poll interval, any time this block changes read/unread state.
const notifyEmailMessagesUpdated = () => {
    window.dispatchEvent(new Event(EMAIL_MESSAGES_UPDATED_EVENT));
};

const PAGE_SIZE = 25;

interface ClientEmailBlockProps {
    id: string;
}

export const ClientEmailBlock = memo(({ id }: ClientEmailBlockProps) => {
    const authData = useSelector(getUserAuthData);
    const isAdmin = authData?.role === RoleKey.ADMIN;

    const [messages, setMessages] = useState<EmailMessage[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<EmailMessage>();
    const [isSendingReply, setIsSendingReply] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isMarkingAsSpam, setIsMarkingAsSpam] = useState(false);

    const clientId = Number(id);

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

    // The whole email module is ADMIN-only (server enforces it too), so a client
    // without that role simply doesn't see this block on the client card.
    if (!isAdmin) {
        return null;
    }

    return (
        <Card padding="16" fullWidth className={s.card}>
            <VStack gap="8" max>
                <Text title="Письма" size="s" bold />

                {!isLoading && !messages.length ? (
                    <Text text="Переписки с этим клиентом пока нет." size="s" />
                ) : (
                    <HStack gap="16" align="start" max className={s.layout}>
                        <div className={s.list}>
                            <EmailMessageList
                                messages={messages}
                                selectedMessageId={selectedMessage?.id}
                                isLoading={isLoading}
                                onSelect={onSelectMessage}
                            />
                            {!isLoading && messages.length < total && (
                                <div className={s.loadMore}>
                                    <Button
                                        theme={ButtonTheme.OUTLINE}
                                        disabled={isLoadingMore}
                                        onClick={onLoadMore}
                                    >
                                        {isLoadingMore ? 'Загрузка...' : 'Загрузить ещё'}
                                    </Button>
                                </div>
                            )}
                        </div>
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
                            <Card padding="24" className={s.emptyState}>
                                <Text text="Выберите письмо, чтобы просмотреть его" size="s" />
                            </Card>
                        )}
                    </HStack>
                )}
            </VStack>
        </Card>
    );
});

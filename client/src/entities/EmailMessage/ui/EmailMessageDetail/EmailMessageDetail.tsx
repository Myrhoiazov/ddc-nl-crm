import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { HStack, VStack } from '@/shared/ui/Stack';
import { EmailMessage } from '../../model/types/emailMessage';
import { EmailComposer, EmailComposerSendPayload } from '../EmailComposer/EmailComposer';
import cls from './EmailMessageDetail.module.scss';

interface EmailMessageDetailProps {
    message: EmailMessage;
    isSendingReply?: boolean;
    isDeleting?: boolean;
    isMarkingAsSpam?: boolean;
    onReply: (html: string, files?: File[]) => Promise<boolean>;
    onDelete: () => void;
    onMarkAsSpam: () => void;
}

const formatDate = (value: string) => new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

const attachmentDownloadUrl = (attachmentId: number) => `${__API__}/api/v1/email/attachments/${attachmentId}/download`;

// Most HTML emails are built as fixed-width tables (~600px), so they render
// consistently across mail clients — `table { width: 100% }` stretches that
// safely. Forcing width:100% on *every* div/p is tempting but wrong: quoted
// "On ... wrote:" reply blocks are commonly indented with margin-left, and
// width:100% + that margin overflows the container, which is what caused the
// clipped/double-scrollbar mess. So we only cap growth (max-width) there and
// rely on overflow-wrap + hidden horizontal scroll as a safety net.
const buildResponsiveEmailHtml = (html: string) => `
    <style>
        html, body {
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            font-family: sans-serif;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        * { max-width: 100% !important; box-sizing: border-box !important; }
        table { width: 100% !important; }
        img { height: auto; }
    </style>
    ${html}
`;

export const EmailMessageDetail = memo((props: EmailMessageDetailProps) => {
    const {
        message, isSendingReply, isDeleting, isMarkingAsSpam, onReply, onDelete, onMarkAsSpam,
    } = props;
    const [bodyFrameHeight, setBodyFrameHeight] = useState(260);
    const bodyFrameRef = useRef<HTMLIFrameElement>(null);
    const responsiveBodyHtml = useMemo(
        () => (message.bodyHtml ? buildResponsiveEmailHtml(message.bodyHtml) : undefined),
        [message.bodyHtml],
    );

    useEffect(() => {
        setBodyFrameHeight(260);
    }, [message.id]);

    // The iframe never auto-sizes to its srcDoc content, so without this it's
    // stuck at a fixed height and shows its own internal scrollbar instead of
    // just being as tall as the email actually is. `allow-same-origin` (without
    // allow-scripts) only lets us read that height from the parent — the email
    // HTML still can't execute any script either way.
    const onBodyFrameLoad = () => {
        const doc = bodyFrameRef.current?.contentDocument;
        if (doc?.body) {
            setBodyFrameHeight(Math.max(doc.body.scrollHeight, 120));
        }
    };

    const onComposerReply = async ({ html, files }: EmailComposerSendPayload) => onReply(html, files);

    const onDeleteClick = () => {
        if (window.confirm('Удалить это письмо? Оно будет перемещено в корзину на почтовом сервере.')) {
            onDelete();
        }
    };

    const onMarkAsSpamClick = () => {
        if (window.confirm('Пометить это письмо как спам?')) {
            onMarkAsSpam();
        }
    };

    return (
        <Card padding="24" fullWidth className={cls.detail}>
            <VStack gap="16" max align="stretch">
                <HStack justify="between" align="start" max>
                    <div>
                        <Text title={message.subject || '(без темы)'} size="m" bold />
                        <Text
                            text={`${message.isOutgoing ? 'Кому' : 'От'}: ${message.isOutgoing ? message.toAddresses.map((a) => a.address).join(', ') : `${message.fromName ? `${message.fromName} ` : ''}<${message.fromAddress}>`}`}
                            size="s"
                        />
                        <Text text={formatDate(message.receivedAt)} size="s" className={cls.date} />
                        {message.client && (
                            <Text text={`Клиент: ${[message.client.firstName, message.client.lastName].filter(Boolean).join(' ')}`} size="s" variant="accent" />
                        )}
                    </div>

                    <HStack gap="8" className={cls.actions}>
                        {!message.isOutgoing && (
                            <Button
                                theme={ButtonTheme.OUTLINE}
                                disabled={isMarkingAsSpam}
                                onClick={onMarkAsSpamClick}
                            >
                                {isMarkingAsSpam ? 'Отправка...' : 'В спам'}
                            </Button>
                        )}
                        <Button
                            theme={ButtonTheme.OUTLINE_RED}
                            disabled={isDeleting}
                            onClick={onDeleteClick}
                        >
                            {isDeleting ? 'Удаление...' : 'Удалить'}
                        </Button>
                    </HStack>
                </HStack>

                <div className={cls.body}>
                    {responsiveBodyHtml ? (
                        <iframe
                            ref={bodyFrameRef}
                            title="email-body"
                            sandbox="allow-same-origin"
                            srcDoc={responsiveBodyHtml}
                            onLoad={onBodyFrameLoad}
                            style={{ height: bodyFrameHeight }}
                            className={cls.bodyFrame}
                        />
                    ) : (
                        <pre className={cls.bodyText}>{message.bodyText || '(пустое письмо)'}</pre>
                    )}
                </div>

                {message.attachments.length > 0 && (
                    <VStack gap="8" max className={cls.attachments}>
                        <Text title={`Вложения (${message.attachments.length})`} size="s" bold />
                        <HStack gap="8" wrap="wrap">
                            {message.attachments.map((attachment) => (
                                <a
                                    key={attachment.id}
                                    href={attachmentDownloadUrl(attachment.id)}
                                    className={cls.attachment}
                                    download={attachment.filename}
                                >
                                    <span className={cls.attachmentName}>{attachment.filename}</span>
                                    <span className={cls.attachmentSize}>{formatFileSize(attachment.sizeBytes)}</span>
                                </a>
                            ))}
                        </HStack>
                    </VStack>
                )}

                <VStack gap="8" max className={cls.replyBox}>
                    <Text title="Ответить" size="s" bold />
                    <EmailComposer
                        onSend={onComposerReply}
                        isSending={isSendingReply}
                        sendLabel="Отправить"
                        placeholder="Текст ответа..."
                    />
                </VStack>
            </VStack>
        </Card>
    );
});

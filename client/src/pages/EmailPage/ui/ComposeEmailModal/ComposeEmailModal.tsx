import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/shared/ui/Modal/Modal';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input/Input';
import { Select } from '@/shared/ui/Select/Select';
import { HStack, VStack } from '@/shared/ui/Stack';
import { EmailAccount } from '@/entities/EmailAccount';
import { EmailComposer, EmailComposerSendPayload, SendEmailPayload } from '@/entities/EmailMessage';
import cls from './ComposeEmailModal.module.scss';

interface ComposeEmailModalProps {
    isOpen: boolean;
    accounts: EmailAccount[];
    isSending?: boolean;
    onClose: () => void;
    onSend: (payload: SendEmailPayload) => Promise<boolean>;
}

export const ComposeEmailModal = memo((props: ComposeEmailModalProps) => {
    const { isOpen, accounts, isSending, onClose, onSend } = props;
    const { t } = useTranslation();
    const [accountId, setAccountId] = useState<string>(String(accounts[0]?.id ?? ''));
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [error, setError] = useState<string>();

    // `accounts` is almost always still empty when this component first mounts
    // (it loads async), so the useState initializer above locks in an empty
    // accountId that a subsequent accounts-load never revisits. Re-sync it each
    // time the modal is opened, once real accounts are available.
    useEffect(() => {
        if (isOpen && !accountId && accounts.length) {
            setAccountId(String(accounts[0].id));
        }
    }, [isOpen, accounts, accountId]);

    const onComposerSend = async ({ html, files }: EmailComposerSendPayload) => {
        setError(undefined);

        if (!accountId || !to.trim() || !subject.trim()) {
            setError('Заполните ящик-отправитель, получателя и тему письма');
            return false;
        }

        const ok = await onSend({
            accountId: Number(accountId),
            to: to.split(',').map((address) => address.trim()).filter(Boolean),
            subject,
            html,
            files,
        });

        if (ok) {
            setTo('');
            setSubject('');
            onClose();
        } else {
            setError('Не удалось отправить письмо');
        }

        return ok;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <Card padding="24" className={cls.modal}>
                <VStack gap="16" max>
                    <Text title="Новое письмо" size="m" bold />

                    <Select
                        label="Отправить из"
                        value={accountId}
                        onChange={setAccountId}
                        options={accounts.map((account) => ({ value: String(account.id), content: account.label }))}
                    />
                    <Input label="Кому" placeholder="client@example.com" value={to} onChange={setTo} fullWidth />
                    <Input label="Тема" value={subject} onChange={setSubject} fullWidth />

                    <EmailComposer
                        onSend={onComposerSend}
                        isSending={isSending}
                        sendLabel={t('Отправить')}
                        placeholder={t('Напишите сообщение...')}
                    />

                    {error && <Text text={error} variant="error" size="s" />}

                    <HStack justify="end" gap="8">
                        <Button theme={ButtonTheme.OUTLINE} onClick={onClose}>{t('Отмена')}</Button>
                    </HStack>
                </VStack>
            </Card>
        </Modal>
    );
});

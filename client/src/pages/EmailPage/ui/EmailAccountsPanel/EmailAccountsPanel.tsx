import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input/Input';
import { CheckBox } from '@/shared/ui/CheckBox';
import { HStack, VStack } from '@/shared/ui/Stack';
import { CreateEmailAccountPayload, EmailAccount } from '@/entities/EmailAccount';
import cls from './EmailAccountsPanel.module.scss';

interface EmailAccountsPanelProps {
    accounts: EmailAccount[];
    syncingAccountId?: number;
    onSync: (accountId: number) => void;
    onDelete: (accountId: number) => void;
    onCreate: (payload: CreateEmailAccountPayload) => Promise<string | undefined>;
}

const emptyForm: CreateEmailAccountPayload = {
    label: '',
    imapHost: '',
    imapPort: 993,
    imapSecure: true,
    smtpHost: '',
    smtpPort: 465,
    smtpSecure: true,
    username: '',
    password: '',
    trashFolder: '',
    spamFolder: '',
};

const formatDate = (value: string | null) => {
    if (!value) {
        return 'ещё не синхронизировано';
    }

    return new Date(value).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const EmailAccountsPanel = memo((props: EmailAccountsPanelProps) => {
    const { accounts, syncingAccountId, onSync, onDelete, onCreate } = props;
    const { t } = useTranslation();
    const [form, setForm] = useState<CreateEmailAccountPayload>(emptyForm);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string>();

    const setField = <K extends keyof CreateEmailAccountPayload>(field: K) => (value: string) => {
        setForm((prev) => ({
            ...prev,
            [field]: field === 'imapPort' || field === 'smtpPort' ? Number(value) || 0 : value,
        }));
    };

    const onSubmit = async () => {
        setError(undefined);
        setIsSaving(true);

        const errorMessage = await onCreate(form);

        setIsSaving(false);

        if (!errorMessage) {
            setForm(emptyForm);
        } else {
            setError(errorMessage);
        }
    };

    return (
        <VStack gap="16" max>
            <Card padding="24" fullWidth>
                <VStack gap="16" max>
                    <Text title={t('Добавить IMAP-аккаунт')} size="s" bold className={cls.sectionTitle} />

                    <div className={cls.formGrid}>
                        <Input label={t('Метка (для себя)')} placeholder="info@ddc.nl" value={form.label} onChange={setField('label')} fullWidth />
                        <Input label="IMAP host" placeholder="mail.example.com" value={form.imapHost} onChange={setField('imapHost')} fullWidth />
                        <Input label={t('Порт (IMAP)')} value={String(form.imapPort)} onChange={setField('imapPort')} fullWidth />
                        <Input label={t('Пользователь')} placeholder="you@example.com" value={form.username} onChange={setField('username')} fullWidth />
                        <Input label="SMTP host" placeholder="mail.example.com" value={form.smtpHost} onChange={setField('smtpHost')} fullWidth />
                        <Input label={t('Порт (SMTP)')} value={String(form.smtpPort)} onChange={setField('smtpPort')} fullWidth />
                        <Input label={t('Папка корзины')} placeholder="Trash" value={form.trashFolder ?? ''} onChange={setField('trashFolder')} fullWidth />
                        <Input label={t('Папка спама')} placeholder="Junk" value={form.spamFolder ?? ''} onChange={setField('spamFolder')} fullWidth />
                    </div>

                    <Input label={t('Пароль / app-password')} type="password" value={form.password} onChange={setField('password')} fullWidth />

                    <HStack gap="24">
                        <CheckBox
                            value={form.imapSecure}
                            onChange={(value) => setForm((prev) => ({ ...prev, imapSecure: value }))}
                            label={t('TLS (SSL) для IMAP — обычно да, порт 993')}
                        />
                        <CheckBox
                            value={form.smtpSecure}
                            onChange={(value) => setForm((prev) => ({ ...prev, smtpSecure: value }))}
                            label={t('TLS (SSL) для SMTP — обычно да, порт 465')}
                        />
                    </HStack>

                    {error && <Text text={error} variant="error" size="s" />}

                    <HStack>
                        <Button theme={ButtonTheme.BACKGROUND_INVERTED} disabled={isSaving} onClick={onSubmit}>
                            {isSaving ? 'Проверка подключения...' : 'Добавить аккаунт'}
                        </Button>
                    </HStack>
                </VStack>
            </Card>

            <Card padding="24" fullWidth>
                <VStack gap="16" max>
                    <Text title={t('Подключённые аккаунты')} size="s" bold className={cls.sectionTitle} />

                    {!accounts.length ? (
                        <Text text={t('Ящиков пока нет — добавьте первый выше.')} size="s" />
                    ) : (
                        <div className={cls.table}>
                            <div className={cls.tableHeader}>
                                <span>{t('Метка')}</span>
                                <span>{t('Host')}</span>
                                <span>{t('User')}</span>
                                <span>{t('Синхронизация')}</span>
                                <span />
                            </div>
                            {accounts.map((account) => (
                                <div key={account.id} className={cls.tableRow}>
                                    <span className={cls.rowLabel}>{account.label}</span>
                                    <span className={cls.rowHost}>{account.imapHost}</span>
                                    <span className={cls.rowHost}>{account.username}</span>
                                    <span className={cls.rowMeta}>{formatDate(account.lastSyncedAt)}</span>
                                    <HStack gap="4" justify="end">
                                        <Button
                                            theme={ButtonTheme.OUTLINE}
                                            disabled={syncingAccountId === account.id}
                                            onClick={() => onSync(account.id)}
                                        >
                                            {syncingAccountId === account.id ? 'Синхронизация...' : 'Sync'}
                                        </Button>
                                        <Button
                                            theme={ButtonTheme.OUTLINE_RED}
                                            onClick={() => onDelete(account.id)}
                                            aria-label={t('Отключить ящик')}
                                        >
                                            {t('✕')}
                                        </Button>
                                    </HStack>
                                </div>
                            ))}
                        </div>
                    )}
                </VStack>
            </Card>
        </VStack>
    );
});

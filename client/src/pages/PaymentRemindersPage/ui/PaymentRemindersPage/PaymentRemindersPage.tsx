import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Page } from '@/widgets/Page/Page';
import { $apiPrivate } from '@/shared/api/api';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Input } from '@/shared/ui/Input/Input';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { CheckBox } from '@/shared/ui/CheckBox';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { RichTextEditor } from '@/shared/ui/RichTextEditor';
import s from './PaymentRemindersPage.module.scss';

type ReminderLanguage = 'RU' | 'EN' | 'NL';
type DeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

interface ReminderSettings {
    offsetDays: 3 | 7;
    sendHour: number;
    sendMinute: number;
    senderEmailAccountId: number | null;
    enabled: boolean;
}

interface EmailAccountOption {
    id: number;
    label: string;
    username: string;
    isActive: boolean;
}

interface ReminderTemplate {
    language: ReminderLanguage;
    subject: string;
    bodyHtml: string;
}

interface ReminderDelivery {
    id: number;
    targetPaymentDate: string;
    status: DeliveryStatus;
    language: ReminderLanguage;
    recipientEmail: string;
    errorMessage?: string | null;
    createdAt: string;
    subscription?: {
        description: string;
        customer?: {
            client?: { firstName?: string | null; lastName?: string | null } | null;
        } | null;
    };
}

interface RunResult {
    sent: number;
    skipped: number;
    failed: number;
    alreadyQueued: number;
}

const LANGUAGE_LABELS: Record<ReminderLanguage, string> = { RU: 'Русский', EN: 'English', NL: 'Nederlands' };
const STATUS_LABELS: Record<DeliveryStatus, string> = {
    PENDING: 'В очереди',
    SENT: 'Отправлено',
    FAILED: 'Ошибка',
    SKIPPED: 'Пропущено',
};

const offsetOptions: SelectOption<string>[] = [
    { value: '3', content: 'За 3 дня' },
    { value: '7', content: 'За 1 неделю' },
];

const statusFilterOptions: SelectOption<string>[] = [
    { value: '', content: 'Все статусы' },
    ...Object.entries(STATUS_LABELS).map(([value, content]) => ({ value, content })),
];

const clientName = (delivery: ReminderDelivery) => {
    const client = delivery.subscription?.customer?.client;
    const name = `${client?.firstName ?? ''} ${client?.lastName ?? ''}`.trim();
    return name || delivery.recipientEmail || '—';
};

const formatDateTime = (value?: string | null) => (
    value
        ? new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '—'
);

const PaymentRemindersPage = memo(() => {
    const [settings, setSettings] = useState<ReminderSettings>();
    const [emailAccounts, setEmailAccounts] = useState<EmailAccountOption[]>([]);
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);
    const [isSettingsSaving, setIsSettingsSaving] = useState(false);

    const [templates, setTemplates] = useState<Record<ReminderLanguage, ReminderTemplate>>();
    const [placeholders, setPlaceholders] = useState<string[]>([]);
    const [activeLanguage, setActiveLanguage] = useState<ReminderLanguage>('RU');
    const [isTemplatesLoading, setIsTemplatesLoading] = useState(true);
    const [isTemplateSaving, setIsTemplateSaving] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);

    const [isRunning, setIsRunning] = useState(false);
    const [runResult, setRunResult] = useState<RunResult>();

    const [deliveries, setDeliveries] = useState<ReminderDelivery[]>([]);
    const [deliveriesStatusFilter, setDeliveriesStatusFilter] = useState('');
    const [isDeliveriesLoading, setIsDeliveriesLoading] = useState(true);

    const loadSettings = useCallback(() => {
        setIsSettingsLoading(true);
        return Promise.all([
            $apiPrivate.get<ReminderSettings>('/payment-reminders/settings'),
            $apiPrivate.get<EmailAccountOption[]>('/email/accounts'),
        ])
            .then(([settingsRes, accountsRes]) => {
                setSettings(settingsRes.data);
                setEmailAccounts(accountsRes.data.filter((account) => account.isActive));
            })
            .catch(() => toast.error('Не удалось загрузить настройки рассылки'))
            .finally(() => setIsSettingsLoading(false));
    }, []);

    const loadTemplates = useCallback(() => {
        setIsTemplatesLoading(true);
        return $apiPrivate.get<{ templates: ReminderTemplate[]; placeholders: string[] }>('/payment-reminders/templates')
            .then(({ data }) => {
                const map = Object.fromEntries(data.templates.map((template) => [template.language, template])) as Record<ReminderLanguage, ReminderTemplate>;
                setTemplates(map);
                setPlaceholders(data.placeholders);
            })
            .catch(() => toast.error('Не удалось загрузить шаблоны писем'))
            .finally(() => setIsTemplatesLoading(false));
    }, []);

    const loadDeliveries = useCallback((status: string) => {
        setIsDeliveriesLoading(true);
        return $apiPrivate.get<ReminderDelivery[]>('/payment-reminders/deliveries', { params: status ? { status } : undefined })
            .then(({ data }) => setDeliveries(data))
            .catch(() => toast.error('Не удалось загрузить историю рассылки'))
            .finally(() => setIsDeliveriesLoading(false));
    }, []);

    useEffect(() => { loadSettings(); }, [loadSettings]);
    useEffect(() => { loadTemplates(); }, [loadTemplates]);
    useEffect(() => { loadDeliveries(deliveriesStatusFilter); }, [loadDeliveries, deliveriesStatusFilter]);

    const onSaveSettings = useCallback(async () => {
        if (!settings) return;
        setIsSettingsSaving(true);
        try {
            // The backend validation is `.strict()` — send only the whitelisted fields,
            // not the raw `settings` object (which also carries id/updatedAt/updatedById
            // from the GET response and would otherwise fail validation).
            const payload = {
                offsetDays: settings.offsetDays,
                sendHour: settings.sendHour,
                sendMinute: settings.sendMinute,
                senderEmailAccountId: settings.senderEmailAccountId,
                enabled: settings.enabled,
            };
            const { data } = await $apiPrivate.put<ReminderSettings>('/payment-reminders/settings', payload);
            setSettings(data);
            toast.success('Настройки рассылки сохранены');
        } catch {
            toast.error('Не удалось сохранить настройки');
        } finally {
            setIsSettingsSaving(false);
        }
    }, [settings]);

    const activeTemplate = templates?.[activeLanguage];

    const onSaveTemplate = useCallback(async () => {
        if (!activeTemplate) return;
        setIsTemplateSaving(true);
        try {
            const { data } = await $apiPrivate.put<ReminderTemplate>(`/payment-reminders/templates/${activeLanguage}`, {
                subject: activeTemplate.subject,
                bodyHtml: activeTemplate.bodyHtml,
            });
            setTemplates((prev) => (prev ? { ...prev, [activeLanguage]: data } : prev));
            toast.success('Шаблон письма сохранён');
        } catch {
            toast.error('Не удалось сохранить шаблон');
        } finally {
            setIsTemplateSaving(false);
        }
    }, [activeTemplate, activeLanguage]);

    const onSendTest = useCallback(async () => {
        if (!activeTemplate || !testEmail.trim()) return;
        setIsSendingTest(true);
        try {
            await $apiPrivate.post(`/payment-reminders/templates/${activeLanguage}/test`, {
                to: testEmail.trim(),
                subject: activeTemplate.subject,
                bodyHtml: activeTemplate.bodyHtml,
            });
            toast.success(`Тестовое письмо отправлено на ${testEmail.trim()}`);
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
            toast.error(message || 'Не удалось отправить тестовое письмо');
        } finally {
            setIsSendingTest(false);
        }
    }, [activeTemplate, activeLanguage, testEmail]);

    const onRunNow = useCallback(async () => {
        if (!window.confirm('Запустить рассылку напоминаний прямо сейчас?')) {
            return;
        }
        setIsRunning(true);
        try {
            const { data } = await $apiPrivate.post<RunResult>('/payment-reminders/run');
            setRunResult(data);
            toast.success(`Готово: отправлено ${data.sent}, пропущено ${data.skipped}, ошибок ${data.failed}`);
            loadDeliveries(deliveriesStatusFilter);
        } catch {
            toast.error('Не удалось запустить рассылку');
        } finally {
            setIsRunning(false);
        }
    }, [loadDeliveries, deliveriesStatusFilter]);

    const emailAccountOptions: SelectOption<string>[] = useMemo(() => [
        { value: '', content: 'Не выбран' },
        ...emailAccounts.map((account) => ({ value: String(account.id), content: `${account.label} (${account.username})` })),
    ], [emailAccounts]);

    return (
        <Page>
            <VStack max gap="24" className={s.page}>
                <div>
                    <Text title="Напоминания об оплате" size="l" bold />
                    <Text text="Автоматическая рассылка клиентам о предстоящем списании по подписке." size="s" className={s.subtitle} />
                </div>

                <Card padding="24" fullWidth className={s.card}>
                    <VStack max gap="16">
                        <Text title="Настройки" size="m" bold />
                        {isSettingsLoading && <Skeleton width="100%" height={160} border="12px" />}
                        {!isSettingsLoading && settings && (
                            <>
                                <div className={s.grid}>
                                    <Select
                                        label="Отправлять"
                                        options={offsetOptions}
                                        value={String(settings.offsetDays)}
                                        onChange={(value) => setSettings({ ...settings, offsetDays: Number(value) as 3 | 7 })}
                                    />
                                    <Input
                                        fullWidth
                                        label="Час отправки (0-23)"
                                        type="number"
                                        value={settings.sendHour}
                                        onChange={(value) => setSettings({ ...settings, sendHour: Math.min(23, Math.max(0, Number(value) || 0)) })}
                                    />
                                    <Input
                                        fullWidth
                                        label="Минута отправки (0-59)"
                                        type="number"
                                        value={settings.sendMinute}
                                        onChange={(value) => setSettings({ ...settings, sendMinute: Math.min(59, Math.max(0, Number(value) || 0)) })}
                                    />
                                    <Select
                                        label="Ящик-отправитель"
                                        options={emailAccountOptions}
                                        value={settings.senderEmailAccountId ? String(settings.senderEmailAccountId) : ''}
                                        onChange={(value) => setSettings({ ...settings, senderEmailAccountId: value ? Number(value) : null })}
                                    />
                                </div>
                                <CheckBox label="Рассылка включена" value={settings.enabled} onChange={(checked) => setSettings({ ...settings, enabled: checked })} />
                                <HStack gap="8" wrap="wrap">
                                    <Button theme={ButtonTheme.BACKGROUND_INVERTED} disabled={isSettingsSaving} onClick={onSaveSettings}>
                                        {isSettingsSaving ? 'Сохранение...' : 'Сохранить настройки'}
                                    </Button>
                                    <Button theme={ButtonTheme.OUTLINE} disabled={isRunning} onClick={onRunNow}>
                                        {isRunning ? 'Запуск...' : 'Запустить сейчас'}
                                    </Button>
                                </HStack>
                                {runResult && (
                                    <Text
                                        size="s"
                                        text={`Последний запуск: отправлено ${runResult.sent}, пропущено ${runResult.skipped}, ошибок ${runResult.failed}, уже в очереди ${runResult.alreadyQueued}`}
                                    />
                                )}
                            </>
                        )}
                    </VStack>
                </Card>

                <Card padding="24" fullWidth className={s.card}>
                    <VStack max gap="16">
                        <Text title="Шаблон письма" size="m" bold />
                        <HStack gap="8" wrap="wrap">
                            {(Object.keys(LANGUAGE_LABELS) as ReminderLanguage[]).map((language) => (
                                <Button
                                    key={language}
                                    theme={language === activeLanguage ? ButtonTheme.BACKGROUND_INVERTED : ButtonTheme.OUTLINE}
                                    onClick={() => setActiveLanguage(language)}
                                >
                                    {LANGUAGE_LABELS[language]}
                                </Button>
                            ))}
                        </HStack>

                        {isTemplatesLoading && <Skeleton width="100%" height={260} border="12px" />}

                        {!isTemplatesLoading && activeTemplate && (
                            <>
                                <Input
                                    fullWidth
                                    label="Тема письма"
                                    type="text"
                                    value={activeTemplate.subject}
                                    onChange={(value) => setTemplates((prev) => (prev ? { ...prev, [activeLanguage]: { ...prev[activeLanguage], subject: value ?? '' } } : prev))}
                                />
                                <RichTextEditor
                                    value={activeTemplate.bodyHtml}
                                    onChange={(html) => setTemplates((prev) => (prev ? { ...prev, [activeLanguage]: { ...prev[activeLanguage], bodyHtml: html } } : prev))}
                                    placeholder="Текст письма..."
                                />
                                <Text
                                    size="s"
                                    className={s.subtitle}
                                    text={`Доступные плейсхолдеры: ${placeholders.map((placeholder) => `{{${placeholder}}}`).join(', ')} — подставляются автоматически при отправке.`}
                                />
                                <Text
                                    size="s"
                                    className={s.subtitle}
                                    text="Логотип, ссылка на сайт, email и юридические реквизиты студии добавляются в конец письма автоматически из карточки бренда — редактировать их здесь не нужно."
                                />
                                <HStack gap="8" wrap="wrap" align="end">
                                    <Button theme={ButtonTheme.BACKGROUND_INVERTED} disabled={isTemplateSaving} onClick={onSaveTemplate} className={s.saveTemplateBtn}>
                                        {isTemplateSaving ? 'Сохранение...' : `Сохранить шаблон (${LANGUAGE_LABELS[activeLanguage]})`}
                                    </Button>
                                </HStack>

                                <div className={s.testSendBlock}>
                                    <Text size="s" title="Проверить письмо" bold />
                                    <Text size="s" className={s.subtitle} text="Отправит текущий текст (даже несохранённый) с примерными данными на указанный адрес — без создания записи в истории." />
                                    <HStack gap="8" wrap="wrap" align="end">
                                        <Input
                                            fullWidth
                                            label="Email для теста"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={testEmail}
                                            onChange={(value) => setTestEmail(value ?? '')}
                                        />
                                        <Button theme={ButtonTheme.OUTLINE} disabled={isSendingTest || !testEmail.trim()} onClick={onSendTest}>
                                            {isSendingTest ? 'Отправка...' : 'Отправить тестовое письмо'}
                                        </Button>
                                    </HStack>
                                </div>
                            </>
                        )}
                    </VStack>
                </Card>

                <Card padding="24" fullWidth className={s.card}>
                    <VStack max gap="16">
                        <HStack max justify="between" align="center" wrap="wrap">
                            <Text title="Очередь и история" size="m" bold />
                            <Select
                                options={statusFilterOptions}
                                value={deliveriesStatusFilter}
                                onChange={(value) => setDeliveriesStatusFilter(value ?? '')}
                            />
                        </HStack>

                        {isDeliveriesLoading && <Skeleton width="100%" height={200} border="12px" />}

                        {!isDeliveriesLoading && deliveries.length === 0 && (
                            <Text size="s" text="Пока нет ни одной отправки." />
                        )}

                        {!isDeliveriesLoading && deliveries.length > 0 && (
                            <div className={s.tableWrapper}>
                                <table className={s.table}>
                                    <thead>
                                        <tr>
                                            <th>Клиент</th>
                                            <th>Дата платежа</th>
                                            <th>Язык</th>
                                            <th>Статус</th>
                                            <th>Создано</th>
                                            <th>Ошибка</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deliveries.map((delivery) => (
                                            <tr key={delivery.id}>
                                                <td>{clientName(delivery)}</td>
                                                <td>{formatDateTime(delivery.targetPaymentDate)}</td>
                                                <td>{LANGUAGE_LABELS[delivery.language]}</td>
                                                <td>
                                                    <span className={`${s.badge} ${s[`status_${delivery.status}`]}`}>
                                                        {STATUS_LABELS[delivery.status]}
                                                    </span>
                                                </td>
                                                <td>{formatDateTime(delivery.createdAt)}</td>
                                                <td className={s.errorCell}>{delivery.errorMessage ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </VStack>
                </Card>
            </VStack>
        </Page>
    );
});

export default PaymentRemindersPage;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { $apiPrivate } from '@/shared/api/api';
import { SelectOption } from '@/shared/ui/Select/Select';

export type ReminderLanguage = 'RU' | 'EN' | 'NL';
export type DeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface ReminderSettings {
    offsetDays: 3 | 7;
    sendHour: number;
    sendMinute: number;
    senderEmailAccountId: number | null;
    enabled: boolean;
}

export interface EmailAccountOption {
    id: number;
    label: string;
    username: string;
    isActive: boolean;
}

export interface ReminderTemplate {
    language: ReminderLanguage;
    subject: string;
    bodyHtml: string;
}

export interface ReminderDelivery {
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

export interface RunResult {
    sent: number;
    skipped: number;
    failed: number;
    alreadyQueued: number;
}

export const usePaymentReminders = () => {
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

    return {
        settings, setSettings,
        emailAccountOptions,
        isSettingsLoading, isSettingsSaving,
        templates, setTemplates,
        placeholders,
        activeLanguage, setActiveLanguage,
        activeTemplate,
        isTemplatesLoading, isTemplateSaving,
        testEmail, setTestEmail,
        isSendingTest,
        isRunning, runResult,
        deliveries,
        deliveriesStatusFilter, setDeliveriesStatusFilter,
        isDeliveriesLoading,
        onSaveSettings,
        onSaveTemplate,
        onSendTest,
        onRunNow,
    };
};

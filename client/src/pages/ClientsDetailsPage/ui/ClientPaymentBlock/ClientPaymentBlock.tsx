import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { $apiPrivate } from '@/shared/api/api';
import { Card } from '@/shared/ui/Card/Card';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import { useTranslation } from 'react-i18next';
import s from './ClientPaymentBlock.module.scss';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { PaymentLinkModal, PaymentLinkPayer } from '../PaymentLinkModal/PaymentLinkModal';
import { toast } from 'react-toastify';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input/Input';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { HStack } from '@/shared/ui/Stack';
import axios from 'axios';

interface PaymentCustomer {
    id: number;
    mollieId?: string;
    email?: string;
    payerName?: string;
    givenName?: string;
    familyName?: string;
}

interface ClientPayment {
    id: number;
    mollieId?: string;
    amountValue: string | number;
    amountCurrency: string;
    description?: string;
    method?: string;
    status: string;
    checkoutUrl?: string;
    isCancelable?: boolean;
    paidAt?: string;
    createdAt: string;
    updatedAt: string;
    customer?: PaymentCustomer | null;
}

interface ClientSubscription {
    id: number;
    mollieId?: string;
    description?: string;
    amountValue: string | number;
    amountCurrency: string;
    interval?: string;
    status: string;
    startDate?: string;
    nextPaymentDate?: string;
    times?: number;
    createdAt?: string;
    updatedAt?: string;
    mandate?: {
        mollieId?: string;
        status?: string;
    } | null;
    customer?: PaymentCustomer | null;
}

interface ClientMandate {
    id: number;
    mollieId?: string;
    status: string;
    method: string;
    signatureDate?: string;
    createdAt?: string;
    updatedAt?: string;
    customer?: PaymentCustomer | null;
}

interface ClientPayerLink {
    id: number;
    payerRelation?: string;
    linkSource?: string;
    isPrimary?: boolean;
    customer?: PaymentCustomer | null;
}

interface ClientPaymentSummary {
    payers: ClientPayerLink[];
    latestPayments: ClientPayment[];
    paymentLinks: ClientPayment[];
    subscriptions: ClientSubscription[];
    activeSubscriptions: ClientSubscription[];
    mandates: ClientMandate[];
    summary: {
        payerCount: number;
        activeSubscriptionCount: number;
        paymentStatus: 'issue' | 'active' | 'unknown';
        lastPayment?: ClientPayment | null;
        latestIssue?: ClientPayment | null;
    };
}

interface ClientPaymentBlockProps {
    id: string;
}

const issueStatuses = ['failed', 'canceled', 'expired', 'charged_back', 'chargeback'];
const restartableSubscriptionStatuses = ['canceled', 'cancelled', 'completed'];
const today = new Date().toISOString().slice(0, 10);

const formatAmount = (value?: string | number, currency = 'EUR') => (
    new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency,
    }).format(Number(value ?? 0))
);

const formatDate = (value?: string) => {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const getPayerName = (customer?: PaymentCustomer | null) => (
    customer?.payerName
    || [customer?.givenName, customer?.familyName].filter(Boolean).join(' ')
    || customer?.email
    || customer?.mollieId
    || 'Плательщик'
);

export const ClientPaymentBlock = memo(({ id }: ClientPaymentBlockProps) => {
    const { t } = useTranslation();
    const [data, setData] = useState<ClientPaymentSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [isPaymentLinkOpen, setIsPaymentLinkOpen] = useState(false);
    const [isMandateOpen, setIsMandateOpen] = useState(false);
    const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<ClientSubscription | null>(null);
    const [restartingSubscription, setRestartingSubscription] = useState<ClientSubscription | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [mandateForm, setMandateForm] = useState({
        customerId: '',
        consumerName: '',
        consumerAccount: '',
        consumerBic: '',
        signatureDate: new Date().toISOString().slice(0, 10),
    });
    const [subscriptionForm, setSubscriptionForm] = useState({
        customerId: '',
        mandateId: '',
        amountValue: '',
        interval: '1 month',
        startDate: today,
        description: '',
    });
    const [editSubscriptionForm, setEditSubscriptionForm] = useState({
        mandateId: '',
        amountValue: '',
        interval: '',
        startDate: '',
        description: '',
        times: '',
    });
    const [restartForm, setRestartForm] = useState({
        mandateId: '',
        startDate: today,
    });

    useEffect(() => {
        setIsLoading(true);
        setError(false);

        $apiPrivate.get<ClientPaymentSummary>(`/clients/${id}/payment-summary`)
            .then((response) => {
                setData(response.data);
            })
            .catch(() => {
                setError(true);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [id, reloadKey]);

    const payers = useMemo<PaymentLinkPayer[]>(() => data?.payers
        .filter((payer) => payer.customer?.id)
        .map((payer) => ({
            id: payer.customer!.id,
            name: getPayerName(payer.customer),
            email: payer.customer?.email,
        })) ?? [], [data?.payers]);
    const payerOptions = useMemo<SelectOption<string>[]>(() => payers
        .filter((payer) => data?.payers.find((link) => link.customer?.id === payer.id)?.customer?.mollieId)
        .map((payer) => ({
            value: String(payer.id),
            content: payer.email ? `${payer.name} · ${payer.email}` : payer.name,
        })), [data?.payers, payers]);
    const selectedSubscriptionPayer = data?.payers.find(
        (payer) => String(payer.customer?.id) === subscriptionForm.customerId,
    )?.customer;
    const validMandates = data?.mandates.filter(
        (mandate) => mandate.status === 'valid'
            && mandate.customer?.mollieId === selectedSubscriptionPayer?.mollieId,
    ) ?? [];
    const mandateOptions = validMandates.map((mandate) => ({
        value: mandate.mollieId ?? '',
        content: `${mandate.mollieId || `Mandate #${mandate.id}`} · ${mandate.method}`,
    })).filter((option) => option.value);
    const getMandateOptionsForCustomer = useCallback((customer?: PaymentCustomer | null) => (
        data?.mandates
            .filter((mandate) => mandate.status === 'valid' && mandate.customer?.id === customer?.id)
            .map((mandate) => ({
                value: mandate.mollieId ?? '',
                content: `${mandate.mollieId || `Mandate #${mandate.id}`} · ${mandate.method}`,
            }))
            .filter((option) => option.value) ?? []
    ), [data?.mandates]);

    const onPaymentLinkCreated = useCallback(() => {
        setReloadKey((prev) => prev + 1);
    }, []);

    const onCopyPaymentLink = useCallback(async (checkoutUrl?: string) => {
        if (!checkoutUrl) {
            return;
        }

        try {
            await navigator.clipboard.writeText(checkoutUrl);
            toast.success('Payment link скопирован');
        } catch {
            toast.error('Не удалось скопировать ссылку');
        }
    }, []);

    const onCancelPaymentLink = useCallback(async (payment: ClientPayment) => {
        if (!window.confirm('Отменить payment link? Плательщик больше не сможет им воспользоваться.')) {
            return;
        }

        try {
            await $apiPrivate.post(`/mollie/payments/${payment.id}/cancel`, {
                clientId: Number(id),
            });
            toast.success('Payment link отменён');
            setReloadKey((prev) => prev + 1);
        } catch {
            toast.error('Не удалось отменить payment link');
        }
    }, [id]);

    const onCreateMandate = useCallback(async () => {
        const payer = data?.payers.find((item) => String(item.customer?.id) === mandateForm.customerId)?.customer;

        if (!payer?.mollieId || !mandateForm.consumerName.trim() || !mandateForm.consumerAccount.trim()) {
            toast.error('Выберите плательщика и заполните имя владельца и IBAN');
            return;
        }

        setIsSaving(true);

        try {
            await $apiPrivate.post('/mollie/mandates', {
                customerId: payer.mollieId,
                consumerName: mandateForm.consumerName.trim(),
                consumerAccount: mandateForm.consumerAccount.replace(/\s/g, '').toUpperCase(),
                consumerBic: mandateForm.consumerBic.trim() || undefined,
                signatureDate: mandateForm.signatureDate,
                method: 'directdebit',
            });
            toast.success('Mandate создан');
            setIsMandateOpen(false);
            setReloadKey((prev) => prev + 1);
        } catch {
            toast.error('Не удалось создать mandate. Проверьте IBAN и данные плательщика.');
        } finally {
            setIsSaving(false);
        }
    }, [data?.payers, mandateForm]);

    const onCreateSubscription = useCallback(async () => {
        const payer = data?.payers.find((item) => String(item.customer?.id) === subscriptionForm.customerId)?.customer;
        const amount = Number(subscriptionForm.amountValue);

        if (!payer?.mollieId || !subscriptionForm.mandateId || !Number.isFinite(amount) || amount <= 0
            || !subscriptionForm.description.trim()) {
            toast.error('Заполните плательщика, valid mandate, сумму и описание');
            return;
        }

        setIsSaving(true);

        try {
            await $apiPrivate.post(`/mollie/mandates/${payer.mollieId}/subscriptions`, {
                customerId: payer.mollieId,
                mandateId: subscriptionForm.mandateId,
                amount: {
                    currency: 'EUR',
                    value: amount.toFixed(2),
                },
                interval: subscriptionForm.interval.trim(),
                startDate: subscriptionForm.startDate,
                description: subscriptionForm.description.trim(),
            });
            toast.success('Подписка создана');
            setIsSubscriptionOpen(false);
            setReloadKey((prev) => prev + 1);
        } catch {
            toast.error('Не удалось создать подписку. Проверьте mandate и дату начала.');
        } finally {
            setIsSaving(false);
        }
    }, [data?.payers, subscriptionForm]);

    const onCancelSubscription = useCallback(async (subscription: ClientSubscription) => {
        if (!subscription.mollieId || !subscription.customer?.id
            || !window.confirm('Остановить активную подписку в Mollie?')) {
            return;
        }

        try {
            await $apiPrivate.delete(`/mollie/subscriptions/${subscription.mollieId}`, {
                data: { customerId: subscription.customer.id },
            });
            toast.success('Подписка остановлена');
            setReloadKey((prev) => prev + 1);
        } catch {
            toast.error('Не удалось остановить подписку');
        }
    }, []);

    const onOpenEditSubscription = useCallback((subscription: ClientSubscription) => {
        setEditingSubscription(subscription);
        setEditSubscriptionForm({
            mandateId: subscription.mandate?.mollieId ?? getMandateOptionsForCustomer(subscription.customer)[0]?.value ?? '',
            amountValue: String(subscription.amountValue ?? ''),
            interval: subscription.interval ?? '1 month',
            startDate: subscription.nextPaymentDate?.slice(0, 10) ?? today,
            description: subscription.description ?? '',
            times: subscription.times ? String(subscription.times) : '',
        });
    }, [getMandateOptionsForCustomer]);

    const onUpdateSubscription = useCallback(async () => {
        if (!editingSubscription?.mollieId || !editingSubscription.customer?.id || !editSubscriptionForm.mandateId) {
            return;
        }

        setIsSaving(true);
        try {
            await $apiPrivate.patch(`/mollie/subscriptions/${editingSubscription.mollieId}`, {
                customerId: editingSubscription.customer.id,
                mandateId: editSubscriptionForm.mandateId,
                amountValue: Number(editSubscriptionForm.amountValue),
                interval: editSubscriptionForm.interval.trim(),
                startDate: editSubscriptionForm.startDate,
                description: editSubscriptionForm.description.trim(),
                times: editSubscriptionForm.times ? Number(editSubscriptionForm.times) : undefined,
            });
            toast.success('Подписка обновлена. При изменении даты Mollie создаёт новую подписку.');
            setEditingSubscription(null);
            setReloadKey((prev) => prev + 1);
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось обновить активную подписку');
        } finally {
            setIsSaving(false);
        }
    }, [editSubscriptionForm, editingSubscription]);

    const onOpenRestartSubscription = useCallback((subscription: ClientSubscription) => {
        setRestartingSubscription(subscription);
        setRestartForm({
            mandateId: getMandateOptionsForCustomer(subscription.customer)[0]?.value ?? '',
            startDate: today,
        });
    }, [getMandateOptionsForCustomer]);

    const onRestartSubscription = useCallback(async () => {
        if (!restartingSubscription?.mollieId || !restartingSubscription.customer?.id || !restartForm.mandateId) {
            toast.error('Для повторного запуска нужен valid mandate');
            return;
        }

        setIsSaving(true);
        try {
            await $apiPrivate.post(`/mollie/subscriptions/${restartingSubscription.mollieId}/restart`, {
                customerId: restartingSubscription.customer.id,
                mandateId: restartForm.mandateId,
                startDate: restartForm.startDate,
            });
            toast.success('Создана новая активная подписка');
            setRestartingSubscription(null);
            setReloadKey((prev) => prev + 1);
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось повторно запустить подписку');
        } finally {
            setIsSaving(false);
        }
    }, [restartForm, restartingSubscription]);

    const onRevokeMandate = useCallback(async (mandate: ClientMandate) => {
        if (!mandate.mollieId || !mandate.customer?.id
            || !window.confirm('Отозвать mandate? Mollie немедленно отменит все связанные активные подписки. Действие необратимо.')) {
            return;
        }

        try {
            await $apiPrivate.delete(`/mollie/customers/${mandate.customer.id}/mandates/${mandate.mollieId}`);
            toast.success('Mandate отозван, связанные подписки остановлены');
            setReloadKey((prev) => prev + 1);
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось отозвать mandate');
        }
    }, []);

    const statusText = useMemo(() => {
        if (data?.summary.paymentStatus === 'issue') {
            return 'Есть проблема';
        }

        if (data?.summary.paymentStatus === 'active') {
            return 'Активно';
        }

        return 'Не настроено';
    }, [data?.summary.paymentStatus]);

    if (isLoading) {
        return (
            <Card id="mollie-account" padding="24" fullWidth className={s.card}>
                <VStack gap="16" max>
                    <Skeleton width={260} height={28} />
                    <Skeleton width="100%" height={72} border="12px" />
                    <Skeleton width="100%" height={72} border="12px" />
                </VStack>
            </Card>
        );
    }

    if (error) {
        return (
            <Card id="mollie-account" padding="24" fullWidth className={s.card}>
                <Text title="Платежи ученика" text="Не удалось загрузить платежный блок." size="m" />
            </Card>
        );
    }

    return (
        <Card id="mollie-account" padding="24" fullWidth className={s.card}>
            <VStack gap="16" max>
                <div className={s.header}>
                    <div>
                        <Text title="Платежи ученика" size="m" bold />
                        <Text text="Плательщики, подписки и последние списания по связанным Mollie профилям." size="s" className={s.subtitle} />
                    </div>
                    <div className={s.headerActions}>
                        <span className={`${s.status} ${data?.summary.paymentStatus === 'issue' ? s.issue : s.active}`}>
                            {statusText}
                        </span>
                        <Button
                            theme={ButtonTheme.BACKGROUND_INVERTED}
                            onClick={() => setIsPaymentLinkOpen(true)}
                        >
                            {t('Payment link')}
                        </Button>
                        <Button theme={ButtonTheme.OUTLINE} onClick={() => setIsMandateOpen(true)}>
                            {t('Создать mandate')}
                        </Button>
                        <Button theme={ButtonTheme.OUTLINE} onClick={() => setIsSubscriptionOpen(true)}>
                            {t('Создать подписку')}
                        </Button>
                    </div>
                </div>

                <div className={s.metrics}>
                    <div className={s.metric}>
                        <span>{t('Плательщики')}</span>
                        <strong>{data?.summary.payerCount ?? 0}</strong>
                    </div>
                    <div className={s.metric}>
                        <span>{t('Активные подписки')}</span>
                        <strong>{data?.summary.activeSubscriptionCount ?? 0}</strong>
                    </div>
                    <div className={s.metric}>
                        <span>{t('Последний платеж')}</span>
                        <strong>{data?.summary.lastPayment
                            ? formatAmount(data.summary.lastPayment.amountValue, data.summary.lastPayment.amountCurrency)
                            : '—'}
                        </strong>
                    </div>
                </div>

                <div className={s.section}>
                    <Text title="Плательщики" size="s" bold />
                    {data?.payers.length ? data.payers.map((payer) => (
                        <div className={s.row} key={payer.id}>
                            <div className={s.rowMain}>
                                <Link className={s.link} to={`/mollie/customers/${payer.customer?.id}`}>
                                    {getPayerName(payer.customer)}
                                </Link>
                                <span>{payer.payerRelation || 'unknown'} · {payer.linkSource || 'manual'}{payer.isPrimary ? ' · primary' : ''}</span>
                            </div>
                            <span>{payer.customer?.email || payer.customer?.mollieId || '—'}</span>
                        </div>
                    )) : (
                        <Text text="Платёжный профиль пока не привязан." size="s" />
                    )}
                </div>

                <div className={s.section}>
                    <Text title="Подписки" text="Активные и завершённые подписки сохраняются в истории." size="s" bold />
                    {data?.subscriptions.length ? data.subscriptions.map((subscription) => (
                        <div className={s.row} key={subscription.id}>
                            <div className={s.rowMain}>
                                <span className={s.primaryText}>{subscription.description || subscription.mollieId || `Subscription #${subscription.id}`}</span>
                                <span>{getPayerName(subscription.customer)} · {subscription.status} {t('· mandate {{mandateId}}', { mandateId: subscription.mandate?.mollieId || '—' })}</span>
                                <span>{t('Создана: {{createdAt}} · старт: {{startDate}} · следующая: {{nextPaymentDate}} · изменена: {{updatedAt}}', { createdAt: formatDate(subscription.createdAt), startDate: formatDate(subscription.startDate), nextPaymentDate: formatDate(subscription.nextPaymentDate), updatedAt: formatDate(subscription.updatedAt) })}</span>
                            </div>
                            <div className={s.subscriptionActions}>
                                <span>{formatAmount(subscription.amountValue, subscription.amountCurrency)} · {subscription.interval || '—'}</span>
                                {subscription.status === 'active' ? (
                                    <>
                                        <Button theme={ButtonTheme.OUTLINE} onClick={() => onOpenEditSubscription(subscription)}>{t('Изменить')}</Button>
                                        <Button theme={ButtonTheme.OUTLINE_RED} onClick={() => onCancelSubscription(subscription)}>{t('Остановить')}</Button>
                                    </>
                                ) : restartableSubscriptionStatuses.includes(subscription.status) ? (
                                    <Button theme={ButtonTheme.OUTLINE} onClick={() => onOpenRestartSubscription(subscription)}>{t('Запустить снова')}</Button>
                                ) : null}
                            </div>
                        </div>
                    )) : (
                        <Text text="Подписок не найдено." size="s" />
                    )}
                </div>

                <div className={s.section}>
                    <Text title="Mandates" text="Отозванные mandates остаются в истории и не могут быть восстановлены." size="s" bold />
                    {data?.mandates.length ? data.mandates.map((mandate) => (
                        <div className={s.row} key={mandate.id}>
                            <div className={s.rowMain}>
                                <span className={s.primaryText}>{mandate.mollieId || `Mandate #${mandate.id}`}</span>
                                <span>{getPayerName(mandate.customer)} · {mandate.method} · {mandate.status}</span>
                                <span>{t('Подписан: {{signatureDate}} · создан: {{createdAt}} · изменён: {{updatedAt}}', { signatureDate: formatDate(mandate.signatureDate), createdAt: formatDate(mandate.createdAt), updatedAt: formatDate(mandate.updatedAt) })}</span>
                            </div>
                            {mandate.status === 'valid' && (
                                <Button theme={ButtonTheme.OUTLINE_RED} onClick={() => onRevokeMandate(mandate)}>{t('Отозвать')}</Button>
                            )}
                        </div>
                    )) : (
                        <Text text="Mandates не найдены." size="s" />
                    )}
                </div>

                <div className={s.section}>
                    <Text title="Payment links" size="s" bold />
                    {data?.paymentLinks.length ? data.paymentLinks.map((payment) => (
                        <div className={s.paymentLinkRow} key={payment.id}>
                            <div className={s.rowMain}>
                                <span className={s.primaryText}>{payment.description || payment.mollieId || `Payment #${payment.id}`}</span>
                                <span>
                                    {getPayerName(payment.customer)} · {formatAmount(payment.amountValue, payment.amountCurrency)} · {payment.status} · {formatDate(payment.createdAt)}
                                </span>
                            </div>
                            <div className={s.paymentLinkActions}>
                                {payment.checkoutUrl && payment.status === 'open' && (
                                    <>
                                        <Button
                                            theme={ButtonTheme.OUTLINE}
                                            onClick={() => onCopyPaymentLink(payment.checkoutUrl)}
                                        >
                                            {t('Копировать')}
                                        </Button>
                                        <Button
                                            theme={ButtonTheme.OUTLINE}
                                            onClick={() => window.open(payment.checkoutUrl, '_blank', 'noopener,noreferrer')}
                                        >
                                            {t('Открыть')}
                                        </Button>
                                    </>
                                )}
                                {payment.isCancelable && (
                                    <Button
                                        theme={ButtonTheme.OUTLINE_RED}
                                        onClick={() => onCancelPaymentLink(payment)}
                                    >
                                        {t('Отменить')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )) : (
                        <Text text="Payment links пока не создавались." size="s" />
                    )}
                </div>

                <div className={s.section}>
                    <Text title="Последние платежи" size="s" bold />
                    {data?.latestPayments.length ? data.latestPayments.map((payment) => (
                        <div className={s.row} key={payment.id}>
                            <div className={s.rowMain}>
                                <span className={s.primaryText}>{payment.description || payment.mollieId || `Payment #${payment.id}`}</span>
                                <span>{getPayerName(payment.customer)} · {payment.method || 'unknown'}</span>
                            </div>
                            <span className={issueStatuses.includes(payment.status) ? s.issueText : ''}>
                                {formatAmount(payment.amountValue, payment.amountCurrency)} · {payment.status} · {formatDate(payment.paidAt || payment.createdAt)}
                            </span>
                        </div>
                    )) : (
                        <Text text="Платежей пока не найдено." size="s" />
                    )}
                </div>
            </VStack>
            <PaymentLinkModal
                clientId={id}
                payers={payers}
                isOpen={isPaymentLinkOpen}
                onClose={() => setIsPaymentLinkOpen(false)}
                onCreated={onPaymentLinkCreated}
            />
            <Modal isOpen={isMandateOpen} onClose={() => setIsMandateOpen(false)} lazy>
                <VStack gap="16" max className={s.actionModal}>
                    <Text title="Создать mandate" text="Mandate разрешает регулярные списания с IBAN плательщика." size="m" bold />
                    <Select
                        label="Плательщик"
                        defaultValue="Выберите плательщика"
                        options={payerOptions}
                        value={mandateForm.customerId}
                        onChange={(customerId) => setMandateForm((prev) => ({ ...prev, customerId }))}
                    />
                    <Input fullWidth label="Имя владельца счёта" value={mandateForm.consumerName} onChange={(consumerName) => setMandateForm((prev) => ({ ...prev, consumerName }))} />
                    <Input fullWidth label="IBAN" value={mandateForm.consumerAccount} onChange={(consumerAccount) => setMandateForm((prev) => ({ ...prev, consumerAccount }))} />
                    <Input fullWidth label="BIC, необязательно" value={mandateForm.consumerBic} onChange={(consumerBic) => setMandateForm((prev) => ({ ...prev, consumerBic }))} />
                    <Input fullWidth label="Дата подписи" type="date" value={mandateForm.signatureDate} onChange={(signatureDate) => setMandateForm((prev) => ({ ...prev, signatureDate }))} />
                    <HStack gap="8" max justify="end">
                        <Button theme={ButtonTheme.OUTLINE} onClick={() => setIsMandateOpen(false)} disabled={isSaving}>{t('Закрыть')}</Button>
                        <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onCreateMandate} disabled={isSaving}>{isSaving ? 'Создание...' : 'Создать mandate'}</Button>
                    </HStack>
                </VStack>
            </Modal>
            <Modal isOpen={isSubscriptionOpen} onClose={() => setIsSubscriptionOpen(false)} lazy>
                <VStack gap="16" max className={s.actionModal}>
                    <Text title="Создать подписку" text="Для подписки требуется valid mandate выбранного плательщика." size="m" bold />
                    <Select
                        label="Плательщик"
                        defaultValue="Выберите плательщика"
                        options={payerOptions}
                        value={subscriptionForm.customerId}
                        onChange={(customerId) => setSubscriptionForm((prev) => ({ ...prev, customerId, mandateId: '' }))}
                    />
                    <Select
                        label="Valid mandate"
                        defaultValue={subscriptionForm.customerId ? 'Выберите mandate' : 'Сначала выберите плательщика'}
                        options={mandateOptions}
                        value={subscriptionForm.mandateId}
                        onChange={(mandateId) => setSubscriptionForm((prev) => ({ ...prev, mandateId }))}
                    />
                    <Input fullWidth label="Сумма, EUR" type="number" min="0.01" step="0.01" value={subscriptionForm.amountValue} onChange={(amountValue) => setSubscriptionForm((prev) => ({ ...prev, amountValue }))} />
                    <Input fullWidth label="Интервал" placeholder="1 month" value={subscriptionForm.interval} onChange={(interval) => setSubscriptionForm((prev) => ({ ...prev, interval }))} />
                    <Input fullWidth label="Дата начала" type="date" value={subscriptionForm.startDate} onChange={(startDate) => setSubscriptionForm((prev) => ({ ...prev, startDate }))} />
                    <Input fullWidth label="Описание" value={subscriptionForm.description} onChange={(description) => setSubscriptionForm((prev) => ({ ...prev, description }))} />
                    <HStack gap="8" max justify="end">
                        <Button theme={ButtonTheme.OUTLINE} onClick={() => setIsSubscriptionOpen(false)} disabled={isSaving}>{t('Закрыть')}</Button>
                        <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onCreateSubscription} disabled={isSaving}>{isSaving ? 'Создание...' : 'Создать подписку'}</Button>
                    </HStack>
                </VStack>
            </Modal>
            <Modal isOpen={Boolean(editingSubscription)} onClose={() => setEditingSubscription(null)} lazy>
                <VStack gap="16" max className={s.actionModal}>
                    <Text title="Изменить активную подписку" text="При изменении даты CRM остановит текущую подписку и создаст новую. История сохранится." size="m" bold />
                    <Select label="Valid mandate" options={getMandateOptionsForCustomer(editingSubscription?.customer)} value={editSubscriptionForm.mandateId} onChange={(mandateId) => setEditSubscriptionForm((prev) => ({ ...prev, mandateId }))} />
                    <Input fullWidth label="Сумма, EUR" type="number" min="0.01" step="0.01" value={editSubscriptionForm.amountValue} onChange={(amountValue) => setEditSubscriptionForm((prev) => ({ ...prev, amountValue }))} />
                    <Input fullWidth label="Интервал" placeholder="1 month" value={editSubscriptionForm.interval} onChange={(interval) => setEditSubscriptionForm((prev) => ({ ...prev, interval }))} />
                    <Input fullWidth label="Дата следующего списания" type="date" min={today} value={editSubscriptionForm.startDate} onChange={(startDate) => setEditSubscriptionForm((prev) => ({ ...prev, startDate }))} />
                    <Input fullWidth label="Количество списаний, необязательно" type="number" min="1" value={editSubscriptionForm.times} onChange={(times) => setEditSubscriptionForm((prev) => ({ ...prev, times }))} />
                    <Input fullWidth label="Описание" value={editSubscriptionForm.description} onChange={(description) => setEditSubscriptionForm((prev) => ({ ...prev, description }))} />
                    <HStack gap="8" max justify="end">
                        <Button theme={ButtonTheme.OUTLINE} onClick={() => setEditingSubscription(null)} disabled={isSaving}>{t('Закрыть')}</Button>
                        <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onUpdateSubscription} disabled={isSaving}>{isSaving ? 'Сохранение...' : 'Сохранить'}</Button>
                    </HStack>
                </VStack>
            </Modal>
            <Modal isOpen={Boolean(restartingSubscription)} onClose={() => setRestartingSubscription(null)} lazy>
                <VStack gap="16" max className={s.actionModal}>
                    <Text title="Запустить подписку снова" text="Mollie создаст новую подписку с параметрами старой. Старая останется в истории." size="m" bold />
                    <Select label="Valid mandate" options={getMandateOptionsForCustomer(restartingSubscription?.customer)} value={restartForm.mandateId} onChange={(mandateId) => setRestartForm((prev) => ({ ...prev, mandateId }))} />
                    <Input fullWidth label="Дата первого списания" type="date" min={today} value={restartForm.startDate} onChange={(startDate) => setRestartForm((prev) => ({ ...prev, startDate }))} />
                    <HStack gap="8" max justify="end">
                        <Button theme={ButtonTheme.OUTLINE} onClick={() => setRestartingSubscription(null)} disabled={isSaving}>{t('Закрыть')}</Button>
                        <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onRestartSubscription} disabled={isSaving}>{isSaving ? 'Запуск...' : 'Запустить снова'}</Button>
                    </HStack>
                </VStack>
            </Modal>
        </Card>
    );
});

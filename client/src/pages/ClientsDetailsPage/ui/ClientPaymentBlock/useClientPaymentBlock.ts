import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { $apiPrivate } from '@/shared/api/api';
import type { SelectOption } from '@/shared/ui/Select/Select';
import { PaymentLinkPayer } from '../PaymentLinkModal/PaymentLinkModal';
import { today, getPayerName } from './helpers';
import type {
    ClientMandate,
    ClientPayment,
    ClientPaymentSummary,
    ClientSubscription,
    PaymentCustomer,
} from './types';

export interface UseClientPaymentBlockResult {
    id: string;
    data: ClientPaymentSummary | null;
    isLoading: boolean;
    error: boolean;
    isPaymentLinkOpen: boolean;
    setIsPaymentLinkOpen: (open: boolean) => void;
    isMandateOpen: boolean;
    setIsMandateOpen: (open: boolean) => void;
    isSubscriptionOpen: boolean;
    setIsSubscriptionOpen: (open: boolean) => void;
    editingSubscription: ClientSubscription | null;
    setEditingSubscription: (subscription: ClientSubscription | null) => void;
    restartingSubscription: ClientSubscription | null;
    setRestartingSubscription: (subscription: ClientSubscription | null) => void;
    isSaving: boolean;
    mandateForm: MandateForm;
    setMandateForm: Dispatch<SetStateAction<MandateForm>>;
    subscriptionForm: SubscriptionForm;
    setSubscriptionForm: Dispatch<SetStateAction<SubscriptionForm>>;
    editSubscriptionForm: EditSubscriptionForm;
    setEditSubscriptionForm: Dispatch<SetStateAction<EditSubscriptionForm>>;
    restartForm: RestartForm;
    setRestartForm: Dispatch<SetStateAction<RestartForm>>;
    payers: PaymentLinkPayer[];
    payerOptions: SelectOption<string>[];
    mandateOptions: SelectOption<string>[];
    getMandateOptionsForCustomer: (customer?: PaymentCustomer | null) => SelectOption<string>[];
    reload: () => void;
    onPaymentLinkCreated: () => void;
    onCopyPaymentLink: (checkoutUrl?: string) => Promise<void>;
    onCancelPaymentLink: (payment: ClientPayment) => Promise<void>;
    onCreateMandate: (form: MandateForm) => Promise<void>;
    onCreateSubscription: (form: SubscriptionForm) => Promise<void>;
    onCancelSubscription: (subscription: ClientSubscription) => Promise<void>;
    onOpenEditSubscription: (subscription: ClientSubscription) => void;
    onUpdateSubscription: (subscription: ClientSubscription, form: EditSubscriptionForm) => Promise<void>;
    onOpenRestartSubscription: (subscription: ClientSubscription) => void;
    onRestartSubscription: (subscription: ClientSubscription, form: RestartForm) => Promise<void>;
    onRevokeMandate: (mandate: ClientMandate) => Promise<void>;
    statusText: string;
}

export interface MandateForm {
    customerId: string;
    consumerName: string;
    consumerAccount: string;
    consumerBic: string;
    signatureDate: string;
}

export interface SubscriptionForm {
    customerId: string;
    mandateId: string;
    amountValue: string;
    interval: string;
    startDate: string;
    description: string;
}

export interface EditSubscriptionForm {
    mandateId: string;
    amountValue: string;
    interval: string;
    startDate: string;
    description: string;
    times: string;
}

export interface RestartForm {
    mandateId: string;
    startDate: string;
}

export const useClientPaymentBlock = ({ id }: { id: string }): UseClientPaymentBlockResult => {
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
    const [mandateForm, setMandateForm] = useState<MandateForm>({
        customerId: '',
        consumerName: '',
        consumerAccount: '',
        consumerBic: '',
        signatureDate: today,
    });
    const [subscriptionForm, setSubscriptionForm] = useState<SubscriptionForm>({
        customerId: '',
        mandateId: '',
        amountValue: '',
        interval: '1 month',
        startDate: today,
        description: '',
    });
    const [editSubscriptionForm, setEditSubscriptionForm] = useState<EditSubscriptionForm>({
        mandateId: '',
        amountValue: '',
        interval: '',
        startDate: '',
        description: '',
        times: '',
    });
    const [restartForm, setRestartForm] = useState<RestartForm>({
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

    const mandateOptions = (data?.mandates
        .filter((mandate) => mandate.status === 'valid'
            && mandate.customer?.mollieId === selectedSubscriptionPayer?.mollieId)
        ?? [])
        .map((mandate) => ({
            value: mandate.mollieId ?? '',
            content: `${mandate.mollieId || `Mandate #${mandate.id}`} · ${mandate.method}`,
        }))
        .filter((option) => option.value);

    const getMandateOptionsForCustomer = useCallback((customer?: PaymentCustomer | null) => (
        data?.mandates
            .filter((mandate) => mandate.status === 'valid' && mandate.customer?.id === customer?.id)
            .map((mandate) => ({
                value: mandate.mollieId ?? '',
                content: `${mandate.mollieId || `Mandate #${mandate.id}`} · ${mandate.method}`,
            }))
            .filter((option) => option.value) ?? []
    ), [data?.mandates]);

    const reload = useCallback(() => setReloadKey((prev) => prev + 1), []);

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
            reload();
        } catch {
            toast.error('Не удалось отменить payment link');
        }
    }, [id, reload]);

    const onCreateMandate = useCallback(async (form: MandateForm) => {
        const payer = data?.payers.find((item) => String(item.customer?.id) === form.customerId)?.customer;

        if (!payer?.mollieId || !form.consumerName.trim() || !form.consumerAccount.trim()) {
            toast.error('Выберите плательщика и заполните имя владельца и IBAN');
            return;
        }

        setIsSaving(true);

        try {
            await $apiPrivate.post('/mollie/mandates', {
                customerId: payer.mollieId,
                consumerName: form.consumerName.trim(),
                consumerAccount: form.consumerAccount.replace(/\s/g, '').toUpperCase(),
                consumerBic: form.consumerBic.trim() || undefined,
                signatureDate: form.signatureDate,
                method: 'directdebit',
            });
            toast.success('Mandate создан');
            setIsMandateOpen(false);
            reload();
        } catch {
            toast.error('Не удалось создать mandate. Проверьте IBAN и данные плательщика.');
        } finally {
            setIsSaving(false);
        }
    }, [data?.payers, reload]);

    const onCreateSubscription = useCallback(async (form: SubscriptionForm) => {
        const payer = data?.payers.find((item) => String(item.customer?.id) === form.customerId)?.customer;
        const amount = Number(form.amountValue);

        if (!payer?.mollieId || !form.mandateId || !Number.isFinite(amount) || amount <= 0
            || !form.description.trim()) {
            toast.error('Заполните плательщика, valid mandate, сумму и описание');
            return;
        }

        setIsSaving(true);

        try {
            await $apiPrivate.post(`/mollie/mandates/${payer.mollieId}/subscriptions`, {
                customerId: payer.mollieId,
                mandateId: form.mandateId,
                amount: {
                    currency: 'EUR',
                    value: amount.toFixed(2),
                },
                interval: form.interval.trim(),
                startDate: form.startDate,
                description: form.description.trim(),
            });
            toast.success('Подписка создана');
            setIsSubscriptionOpen(false);
            reload();
        } catch {
            toast.error('Не удалось создать подписку. Проверьте mandate и дату начала.');
        } finally {
            setIsSaving(false);
        }
    }, [data?.payers, reload]);

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
            reload();
        } catch {
            toast.error('Не удалось остановить подписку');
        }
    }, [reload]);

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

    const onUpdateSubscription = useCallback(async (subscription: ClientSubscription, form: EditSubscriptionForm) => {
        if (!subscription.mollieId || !subscription.customer?.id || !form.mandateId) {
            return;
        }

        setIsSaving(true);
        try {
            await $apiPrivate.patch(`/mollie/subscriptions/${subscription.mollieId}`, {
                customerId: subscription.customer.id,
                mandateId: form.mandateId,
                amountValue: Number(form.amountValue),
                interval: form.interval.trim(),
                startDate: form.startDate,
                description: form.description.trim(),
                times: form.times ? Number(form.times) : undefined,
            });
            toast.success('Подписка обновлена. При изменении даты Mollie создаёт новую подписку.');
            setEditingSubscription(null);
            reload();
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось обновить активную подписку');
        } finally {
            setIsSaving(false);
        }
    }, [reload]);

    const onOpenRestartSubscription = useCallback((subscription: ClientSubscription) => {
        setRestartingSubscription(subscription);
        setRestartForm({
            mandateId: getMandateOptionsForCustomer(subscription.customer)[0]?.value ?? '',
            startDate: today,
        });
    }, [getMandateOptionsForCustomer]);

    const onRestartSubscription = useCallback(async (subscription: ClientSubscription, form: RestartForm) => {
        if (!subscription.mollieId || !subscription.customer?.id || !form.mandateId) {
            toast.error('Для повторного запуска нужен valid mandate');
            return;
        }

        setIsSaving(true);
        try {
            await $apiPrivate.post(`/mollie/subscriptions/${subscription.mollieId}/restart`, {
                customerId: subscription.customer.id,
                mandateId: form.mandateId,
                startDate: form.startDate,
            });
            toast.success('Создана новая активная подписка');
            setRestartingSubscription(null);
            reload();
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось повторно запустить подписку');
        } finally {
            setIsSaving(false);
        }
    }, [reload]);

    const onRevokeMandate = useCallback(async (mandate: ClientMandate) => {
        if (!mandate.mollieId || !mandate.customer?.id
            || !window.confirm('Отозвать mandate? Mollie немедленно отменит все связанные активные подписки. Действие необратимо.')) {
            return;
        }

        try {
            await $apiPrivate.delete(`/mollie/customers/${mandate.customer.id}/mandates/${mandate.mollieId}`);
            toast.success('Mandate отозван, связанные подписки остановлены');
            reload();
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось отозвать mandate');
        }
    }, [reload]);

    const statusText = useMemo(() => {
        if (data?.summary.paymentStatus === 'issue') {
            return 'Есть проблема';
        }

        if (data?.summary.paymentStatus === 'active') {
            return 'Активно';
        }

        return 'Не настроено';
    }, [data?.summary.paymentStatus]);

    return {
        id,
        data,
        isLoading,
        error,
        isPaymentLinkOpen, setIsPaymentLinkOpen,
        isMandateOpen, setIsMandateOpen,
        isSubscriptionOpen, setIsSubscriptionOpen,
        editingSubscription, setEditingSubscription,
        restartingSubscription, setRestartingSubscription,
        isSaving,
        mandateForm, setMandateForm,
        subscriptionForm, setSubscriptionForm,
        editSubscriptionForm, setEditSubscriptionForm,
        restartForm, setRestartForm,
        payers,
        payerOptions,
        mandateOptions,
        getMandateOptionsForCustomer,
        reload,
        onPaymentLinkCreated: reload,
        onCopyPaymentLink,
        onCancelPaymentLink,
        onCreateMandate,
        onCreateSubscription,
        onCancelSubscription,
        onOpenEditSubscription,
        onUpdateSubscription,
        onOpenRestartSubscription,
        onRestartSubscription,
        onRevokeMandate,
        statusText,
    };
};

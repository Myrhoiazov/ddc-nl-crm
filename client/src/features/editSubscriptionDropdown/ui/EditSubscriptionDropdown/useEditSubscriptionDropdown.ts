import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { $apiPrivate } from '@/shared/api/api';
import { MollieSubscription } from '@/entities/MollieSubscription';
import { Mandate } from '@/entities/Mandate';

const today = new Date().toISOString().slice(0, 10);

export interface SubscriptionFormState {
    mandateId: string;
    amountValue: string;
    interval: string;
    startDate: string;
    description: string;
    times: string;
}

export const useEditSubscriptionDropdown = (
    customerId: string,
    subscription: MollieSubscription,
    mandates: Mandate[],
    reloadPage?: () => void,
) => {
    const [modal, setModal] = useState<'cancel' | 'edit' | 'restart'>();
    const [isSaving, setIsSaving] = useState(false);
    const validMandateOptions = useMemo(() => mandates
        .filter((mandate) => mandate.status === 'valid' && mandate.id)
        .map((mandate) => ({
            value: mandate.id!,
            content: `${mandate.id} · ${mandate.method || 'unknown'}`,
        })), [mandates]);
    const [form, setForm] = useState({
        mandateId: subscription.mandateId ?? validMandateOptions[0]?.value ?? '',
        amountValue: subscription.amount?.value ?? '',
        interval: subscription.interval ?? '1 month',
        startDate: subscription.nextPaymentDate?.slice(0, 10) ?? today,
        description: subscription.description ?? '',
        times: subscription.times ? String(subscription.times) : '',
    });
    const [restartDate, setRestartDate] = useState(today);

    const closeModal = useCallback(() => {
        if (!isSaving) setModal(undefined);
    }, [isSaving]);

    const openModal = useCallback((nextModal: 'cancel' | 'edit' | 'restart') => {
        if (!form.mandateId && validMandateOptions[0]?.value) {
            setForm((prev) => ({ ...prev, mandateId: validMandateOptions[0].value }));
        }
        setModal(nextModal);
    }, [form.mandateId, validMandateOptions]);

    const onCancel = useCallback(async () => {
        if (!subscription.id) return;
        setIsSaving(true);
        try {
            await $apiPrivate.delete(`/mollie/subscriptions/${subscription.id}`, {
                data: { customerId: Number(customerId) },
            });
            toast.info('Подписка отменена');
            setModal(undefined);
            reloadPage?.();
        } catch {
            toast.error('Не удалось отменить подписку');
        } finally {
            setIsSaving(false);
        }
    }, [customerId, reloadPage, subscription.id]);

    const onUpdate = useCallback(async () => {
        if (!subscription.id || !form.mandateId) return;
        setIsSaving(true);
        try {
            await $apiPrivate.patch(`/mollie/subscriptions/${subscription.id}`, {
                customerId: Number(customerId),
                mandateId: form.mandateId,
                amountValue: Number(form.amountValue),
                interval: form.interval,
                startDate: form.startDate,
                description: form.description,
                times: form.times ? Number(form.times) : undefined,
            });
            toast.success('Подписка обновлена. При изменении даты Mollie создаёт новую подписку.');
            setModal(undefined);
            reloadPage?.();
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось обновить подписку');
        } finally {
            setIsSaving(false);
        }
    }, [customerId, form, reloadPage, subscription.id]);

    const onRestart = useCallback(async () => {
        if (!subscription.id || !form.mandateId) return;
        setIsSaving(true);
        try {
            await $apiPrivate.post(`/mollie/subscriptions/${subscription.id}/restart`, {
                customerId: Number(customerId),
                mandateId: form.mandateId,
                startDate: restartDate,
            });
            toast.success('Новая подписка создана');
            setModal(undefined);
            reloadPage?.();
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось повторно запустить подписку');
        } finally {
            setIsSaving(false);
        }
    }, [customerId, form.mandateId, reloadPage, restartDate, subscription.id]);

    const items = subscription.status === 'active'
        ? [
            { content: 'Изменить подписку', onClick: () => openModal('edit') },
            { content: 'Остановить подписку', onClick: () => openModal('cancel') },
        ]
        : ['canceled', 'completed'].includes(subscription.status ?? '')
            ? [{ content: 'Запустить снова', onClick: () => openModal('restart') }]
            : [];

    return {
        modal,
        isSaving,
        validMandateOptions,
        form,
        setForm,
        restartDate,
        setRestartDate,
        closeModal,
        items,
        today,
        onCancel,
        onUpdate,
        onRestart,
    };
};

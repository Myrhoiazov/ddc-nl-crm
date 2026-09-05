import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { MollieSubscription } from '@/entities/MollieSubscription';

export const useCancelSubscription = (
    customerId: string,
    subscription: MollieSubscription,
    setIsSaving: (value: boolean) => void,
    finishModal: () => void,
    reloadPage: (() => void) | undefined,
) => useCallback(async () => {
    if (!subscription.id) return;
    setIsSaving(true);
    try {
        await $apiPrivate.delete(`/mollie/subscriptions/${subscription.id}`, {
            data: { customerId: Number(customerId) },
        });
        toast.info('Подписка отменена');
        finishModal();
        reloadPage?.();
    } catch {
        toast.error('Не удалось отменить подписку');
    } finally {
        setIsSaving(false);
    }
}, [customerId, reloadPage, subscription.id, finishModal, setIsSaving]);

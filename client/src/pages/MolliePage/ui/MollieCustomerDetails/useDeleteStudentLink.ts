import { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { MollieClient } from '@/entities/MollieClient';

export const useDeleteStudentLink = (
    customerId: string,
    setCustomer: Dispatch<SetStateAction<MollieClient | null>>,
    setIsSaving: (value: boolean) => void,
    onChanged: () => void,
) => async (linkId: string | number) => {
    if (!window.confirm('Удалить связь ученика с платёжным профилем?')) {
        return;
    }

    setIsSaving(true);
    try {
        const { data } = await $apiPrivate.delete<MollieClient>(
            `/mollie/customers/${customerId}/student-links/${linkId}`,
        );
        setCustomer(data);
        onChanged();
        toast.success('Связь удалена');
    } catch {
        toast.error('Не удалось удалить связь');
    } finally {
        setIsSaving(false);
    }
};

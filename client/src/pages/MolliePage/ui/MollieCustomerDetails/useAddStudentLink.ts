import { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { MollieClient } from '@/entities/MollieClient';
import { PayerRelation } from './studentLinksHelpers';

export const useAddStudentLink = (
    customerId: string,
    customer: MollieClient | null,
    setCustomer: Dispatch<SetStateAction<MollieClient | null>>,
    setIsSaving: (value: boolean) => void,
    onChanged: () => void,
) => async (selectedClientId: string, payerRelation: PayerRelation, onSaved: () => void) => {
    if (!selectedClientId) {
        toast.error('Выберите ученика');
        return;
    }

    setIsSaving(true);
    try {
        const { data } = await $apiPrivate.post<MollieClient>(
            `/mollie/customers/${customerId}/student-links`,
            {
                clientId: selectedClientId,
                payerRelation,
                isPrimary: !(customer?.clientLinks?.length),
            },
        );
        setCustomer(data);
        onSaved();
        onChanged();
        toast.success('Ученик привязан к платёжному профилю');
    } catch {
        toast.error('Не удалось привязать ученика');
    } finally {
        setIsSaving(false);
    }
};

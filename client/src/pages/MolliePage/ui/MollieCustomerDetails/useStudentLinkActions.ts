import { Dispatch, SetStateAction, useState } from 'react';
import { MollieClient } from '@/entities/MollieClient';
import { PayerRelation } from './studentLinksHelpers';
import { useAddStudentLink } from './useAddStudentLink';
import { useDeleteStudentLink } from './useDeleteStudentLink';

export const useStudentLinkActions = (
    customerId: string,
    customer: MollieClient | null,
    setCustomer: Dispatch<SetStateAction<MollieClient | null>>,
    onChanged: () => void,
) => {
    const [selectedClientId, setSelectedClientId] = useState('');
    const [payerRelation, setPayerRelation] = useState<PayerRelation>('parent');
    const [isSaving, setIsSaving] = useState(false);

    const addStudentLink = useAddStudentLink(customerId, customer, setCustomer, setIsSaving, onChanged);
    const onDeleteLink = useDeleteStudentLink(customerId, setCustomer, setIsSaving, onChanged);

    const onAddStudent = () => addStudentLink(selectedClientId, payerRelation, () => setSelectedClientId(''));

    return {
        selectedClientId, setSelectedClientId, payerRelation, setPayerRelation, isSaving, onAddStudent, onDeleteLink,
    };
};

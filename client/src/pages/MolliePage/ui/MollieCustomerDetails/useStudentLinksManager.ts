import { useStudentLinksData } from './useStudentLinksData';
import { useStudentLinkActions } from './useStudentLinkActions';

export type { PayerRelation } from './studentLinksHelpers';
export { getStudentName } from './studentLinksHelpers';

export const useStudentLinksManager = (customerId: string, version: number, onChanged: () => void) => {
    const {
        customer, setCustomer, isLoading, error, availableClientOptions,
    } = useStudentLinksData(customerId, version);

    const {
        selectedClientId, setSelectedClientId, payerRelation, setPayerRelation, isSaving, onAddStudent, onDeleteLink,
    } = useStudentLinkActions(customerId, customer, setCustomer, onChanged);

    return {
        customer,
        selectedClientId,
        setSelectedClientId,
        payerRelation,
        setPayerRelation,
        isLoading,
        isSaving,
        error,
        availableClientOptions,
        onAddStudent,
        onDeleteLink,
    };
};

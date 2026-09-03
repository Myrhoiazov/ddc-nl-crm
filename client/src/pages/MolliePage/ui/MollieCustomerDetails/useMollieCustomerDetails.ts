import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import { $apiPrivate } from '@/shared/api/api';
import { Mandate } from '@/entities/Mandate';
import { fetchMollieClientData } from '@/features/editMollieClientDropdown';
import { fetchAllMandates } from '../../model/services/fetchAllMandates/fetchAllMandates';
import { fetchAllSubscriptions } from '../../model/services/fetchAllSubscriptions/fetchAllSubscriptions';
import {
    getMollieClientsPageIsLoading,
    getMollieClientsPageMandates,
    getMollieClientsPageSubscriptions,
} from '../../model/selectors/mollieClientsPageSelectors';

export const useMollieCustomerDetails = (customerId: string | undefined) => {
    const dispatch = useAppDispatch();
    const mandates = useSelector(getMollieClientsPageMandates);
    const subscriptions = useSelector(getMollieClientsPageSubscriptions);
    const isLoading = useSelector(getMollieClientsPageIsLoading);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [detailsVersion, setDetailsVersion] = useState(0);

    useInitialEffect(() => {
        if (customerId) {
            dispatch(fetchAllMandates({ customerId }));
            dispatch(fetchAllSubscriptions({ customerId }));
        }
    });

    const onOpenEditModal = async () => {
        if (!customerId) return;
        setIsEditModalOpen(true);
        dispatch(fetchMollieClientData(customerId));
    };

    const onCloseEditModal = () => {
        setIsEditModalOpen(false);
    };

    const onReloadCustomerDetails = () => {
        if (!customerId) return;
        setDetailsVersion((version) => version + 1);
        dispatch(fetchAllMandates({ customerId }));
        dispatch(fetchAllSubscriptions({ customerId }));
    };

    const onRevokeMandate = async (mandate: Mandate) => {
        if (!customerId || mandate.status !== 'valid' || !mandate.id
            || !window.confirm('Отозвать mandate? Все связанные активные подписки будут отменены. Действие необратимо.')) {
            return;
        }

        try {
            await $apiPrivate.delete(`/mollie/customers/${customerId}/mandates/${mandate.id}`);
            toast.success('Mandate отозван');
            onReloadCustomerDetails();
        } catch (error) {
            const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined;
            toast.error(detail || 'Не удалось отозвать mandate');
        }
    };

    return {
        mandates,
        subscriptions,
        isLoading,
        isEditModalOpen,
        detailsVersion,
        onOpenEditModal,
        onCloseEditModal,
        onReloadCustomerDetails,
        onRevokeMandate,
    };
};

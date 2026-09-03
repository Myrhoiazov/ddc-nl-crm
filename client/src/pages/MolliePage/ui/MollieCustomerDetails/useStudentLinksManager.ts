import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { MollieClient } from '@/entities/MollieClient';
import { Client } from '@/entities/Client';

export type PayerRelation = 'unknown' | 'self' | 'parent' | 'guardian' | 'other';

export const getStudentName = (client?: {
    id?: string | number;
    firstName?: string;
    lastName?: string;
    email?: string;
} | null) => (
    [client?.firstName, client?.lastName].filter(Boolean).join(' ')
    || client?.email
    || (client?.id ? `Ученик #${client.id}` : 'Ученик')
);

export const useStudentLinksManager = (customerId: string, version: number, onChanged: () => void) => {
    const [customer, setCustomer] = useState<MollieClient | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [payerRelation, setPayerRelation] = useState<PayerRelation>('parent');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        setError(false);

        Promise.all([
            $apiPrivate.get<MollieClient>(`/mollie/customers/${customerId}`),
            $apiPrivate.get<Client[]>('/clients'),
        ])
            .then(([customerResponse, clientsResponse]) => {
                setCustomer(customerResponse.data);
                setClients(clientsResponse.data ?? []);
            })
            .catch(() => {
                setError(true);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [customerId, version]);

    const clientOptions = useMemo(
        () => clients.map((client) => ({
            value: String(client.id),
            content: `${getStudentName(client)}${client.email ? ` · ${client.email}` : ''}`,
        })),
        [clients],
    );

    const linkedClientIds = useMemo(
        () => new Set((customer?.clientLinks ?? [])
            .map((link) => link.client?.id)
            .filter(Boolean)
            .map(String)),
        [customer],
    );

    const availableClientOptions = useMemo(
        () => clientOptions.filter((option) => !linkedClientIds.has(option.value)),
        [clientOptions, linkedClientIds],
    );

    const onAddStudent = async () => {
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
            setSelectedClientId('');
            onChanged();
            toast.success('Ученик привязан к платёжному профилю');
        } catch {
            toast.error('Не удалось привязать ученика');
        } finally {
            setIsSaving(false);
        }
    };

    const onDeleteLink = async (linkId: string | number) => {
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

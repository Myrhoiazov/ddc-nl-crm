import { useEffect, useMemo, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { MollieClient } from '@/entities/MollieClient';
import { Client } from '@/entities/Client';
import { getStudentName } from './studentLinksHelpers';

export const useStudentLinksData = (customerId: string, version: number) => {
    const [customer, setCustomer] = useState<MollieClient | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(false);
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
            .catch(() => setError(true))
            .finally(() => setIsLoading(false));
    }, [customerId, version]);

    const linkedClientIds = useMemo(
        () => new Set((customer?.clientLinks ?? [])
            .map((link) => link.client?.id)
            .filter(Boolean)
            .map(String)),
        [customer],
    );

    const availableClientOptions = useMemo(() => clients
        .map((client) => ({
            value: String(client.id),
            content: `${getStudentName(client)}${client.email ? ` · ${client.email}` : ''}`,
        }))
        .filter((option) => !linkedClientIds.has(option.value)), [clients, linkedClientIds]);

    return {
        customer, setCustomer, isLoading, error, availableClientOptions,
    };
};

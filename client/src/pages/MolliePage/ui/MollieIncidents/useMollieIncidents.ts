import { useCallback, useEffect, useMemo, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';

export type IncidentTypeFilter = 'all' | 'payments' | 'subscriptions' | 'customers';

export interface IncidentCustomer {
    id: number;
    mollieId?: string;
    email?: string;
    givenName?: string;
    familyName?: string;
    payerName?: string;
    payerRelation?: string;
    linkSource?: string;
    client?: {
        id: number;
        firstName?: string;
        lastName?: string;
        email?: string;
        phoneNumber?: string;
    } | null;
    clientLinks?: {
        id: number;
        payerRelation?: string;
        linkSource?: string;
        isPrimary?: boolean;
        client?: {
            id: number;
            firstName?: string;
            lastName?: string;
            email?: string;
            phoneNumber?: string;
        };
    }[];
}

export interface IncidentSubscription {
    id: number;
    mollieId?: string;
    status?: string;
    description?: string;
}

export interface IncidentPayment {
    id: number;
    mollieId?: string;
    status: string;
    amountValue: string | number;
    amountCurrency: string;
}

export interface MollieIncident {
    id: string;
    type: 'payment' | 'subscription' | 'customer';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    status: string;
    amountValue?: string | number;
    amountCurrency?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    customer?: IncidentCustomer | null;
    subscription?: IncidentSubscription | null;
    payment?: IncidentPayment | null;
}

interface MollieIncidentsResponse {
    items: MollieIncident[];
    totals: {
        total: number;
        payments: number;
        subscriptions: number;
        customers: number;
    };
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface IncidentFilters {
    _q: string;
    type: IncidentTypeFilter;
}

interface SyncResult {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
}

const PAGE_SIZE = 25;

export const defaultFilters: IncidentFilters = {
    _q: '',
    type: 'all',
};

export const useMollieIncidents = () => {
    const [filters, setFilters] = useState<IncidentFilters>(defaultFilters);
    const [incidents, setIncidents] = useState<MollieIncident[]>([]);
    const [totals, setTotals] = useState<MollieIncidentsResponse['totals']>({
        total: 0,
        payments: 0,
        subscriptions: 0,
        customers: 0,
    });
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [resolvingIncidentId, setResolvingIncidentId] = useState<string>();
    const [error, setError] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string>();

    const loadIncidents = useCallback(async (nextFilters = filters, nextPage = page) => {
        setIsLoading(true);
        setError(false);

        try {
            const { data } = await $apiPrivate.get<MollieIncidentsResponse>('/mollie/incidents', {
                params: {
                    _page: nextPage,
                    _limit: PAGE_SIZE,
                    _q: nextFilters._q.trim() || undefined,
                    type: nextFilters.type === 'all' ? undefined : nextFilters.type,
                },
            });

            setIncidents(data.items);
            setTotals(data.totals);
            setTotal(data.total);
            setPage(data.page);
            setTotalPages(data.totalPages);
        } catch {
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [filters, page]);

    useEffect(() => {
        loadIncidents(defaultFilters, 1);
    }, []);

    const onApplyFilters = useCallback(() => {
        loadIncidents(filters, 1);
    }, [filters, loadIncidents]);

    const onResetFilters = useCallback(() => {
        setFilters(defaultFilters);
        loadIncidents(defaultFilters, 1);
    }, [loadIncidents]);

    const onSyncPayments = useCallback(async () => {
        setIsSyncing(true);

        try {
            const { data } = await $apiPrivate.post<SyncResult>('/mollie/sync/payments');
            setSyncMessage(`Sync payments: создано ${data.created}, обновлено ${data.updated}, пропущено ${data.skipped}, ошибок ${data.errors}`);
            await loadIncidents(filters, 1);
        } finally {
            setIsSyncing(false);
        }
    }, [filters, loadIncidents]);

    const onPreviousPage = useCallback(() => {
        loadIncidents(filters, Math.max(page - 1, 1));
    }, [filters, loadIncidents, page]);

    const onNextPage = useCallback(() => {
        loadIncidents(filters, Math.min(page + 1, totalPages));
    }, [filters, loadIncidents, page, totalPages]);

    const onResolveIncident = useCallback(async (incident: MollieIncident) => {
        if (!window.confirm(`Пометить «${incident.title}» как решённую проблему?`)) {
            return;
        }

        setResolvingIncidentId(incident.id);

        try {
            await $apiPrivate.post(`/mollie/incidents/${incident.id}/resolve`);
            await loadIncidents(filters, page);
        } finally {
            setResolvingIncidentId(undefined);
        }
    }, [filters, loadIncidents, page]);

    const summaryCards = useMemo(
        () => [
            { label: 'Всего проблем', value: totals.total, accent: totals.total ? 'danger' : 'success' },
            { label: 'Платежи', value: totals.payments, accent: totals.payments ? 'danger' : 'neutral' },
            { label: 'Подписки', value: totals.subscriptions, accent: totals.subscriptions ? 'warning' : 'neutral' },
            { label: 'Профили: email/ученик', value: totals.customers, accent: totals.customers ? 'info' : 'neutral' },
        ],
        [totals],
    );

    return {
        filters,
        setFilters,
        incidents,
        summaryCards,
        total,
        page,
        totalPages,
        isLoading,
        isSyncing,
        resolvingIncidentId,
        error,
        syncMessage,
        onApplyFilters,
        onResetFilters,
        onSyncPayments,
        onPreviousPage,
        onNextPage,
        onResolveIncident,
    };
};

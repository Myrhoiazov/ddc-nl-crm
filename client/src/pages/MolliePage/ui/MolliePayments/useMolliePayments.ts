import { useCallback, useEffect, useMemo, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';

export type PaymentStatusFilter = 'all' | 'paid' | 'failed' | 'canceled' | 'expired' | 'pending' | 'open';
export type PaymentMethodFilter = 'all' | 'directdebit' | 'creditcard' | 'ideal' | 'banktransfer' | 'paypal' | 'unknown';

export interface MolliePaymentCustomer {
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

export interface MolliePaymentSubscription {
    id: number;
    mollieId?: string;
    status?: string;
    description?: string;
}

export interface MolliePayment {
    id: number;
    mollieId?: string;
    amountValue: string | number;
    amountCurrency: string;
    description?: string;
    method?: string;
    status: string;
    paidAt?: string;
    createdAt: string;
    updatedAt: string;
    customer?: MolliePaymentCustomer;
    subscription?: MolliePaymentSubscription;
}

interface MolliePaymentsResponse {
    items: MolliePayment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaymentFilters {
    _q: string;
    status: PaymentStatusFilter;
    method: PaymentMethodFilter;
    issueOnly: boolean;
    dateFrom: string;
    dateTo: string;
}

const PAGE_SIZE = 25;

export const defaultFilters: PaymentFilters = {
    _q: '',
    status: 'all',
    method: 'all',
    issueOnly: false,
    dateFrom: '',
    dateTo: '',
};

export const issueStatuses = ['failed', 'canceled', 'expired', 'charged_back', 'chargeback'];

export const useMolliePayments = () => {
    const [filters, setFilters] = useState<PaymentFilters>(defaultFilters);
    const [payments, setPayments] = useState<MolliePayment[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string>();

    const loadPayments = useCallback(async (nextFilters = filters, nextPage = page) => {
        setIsLoading(true);
        setError(false);

        try {
            const { data } = await $apiPrivate.get<MolliePaymentsResponse>('/mollie/payments', {
                params: {
                    _page: nextPage,
                    _limit: PAGE_SIZE,
                    _q: nextFilters._q.trim() || undefined,
                    status: nextFilters.status === 'all' ? undefined : nextFilters.status,
                    method: nextFilters.method === 'all' ? undefined : nextFilters.method,
                    issueOnly: nextFilters.issueOnly || undefined,
                    dateFrom: nextFilters.dateFrom || undefined,
                    dateTo: nextFilters.dateTo || undefined,
                },
            });

            setPayments(data.items);
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
        loadPayments(defaultFilters, 1);
    }, []);

    const onApplyFilters = useCallback(() => {
        loadPayments(filters, 1);
    }, [filters, loadPayments]);

    const onResetFilters = useCallback(() => {
        setFilters(defaultFilters);
        loadPayments(defaultFilters, 1);
    }, [loadPayments]);

    const onSyncPayments = useCallback(async () => {
        setIsSyncing(true);

        try {
            const { data } = await $apiPrivate.post<{ created: number; updated: number; skipped: number; errors: number }>('/mollie/sync/payments');
            setSyncMessage(`Sync payments: создано ${data.created}, обновлено ${data.updated}, пропущено ${data.skipped}, ошибок ${data.errors}`);
            await loadPayments(filters, 1);
        } finally {
            setIsSyncing(false);
        }
    }, [filters, loadPayments]);

    const onExport = useCallback(async (issueOnly: boolean) => {
        const response = await $apiPrivate.get('/mollie/payments/export.csv', {
            params: {
                issueOnly: issueOnly || undefined,
                status: issueOnly || filters.status === 'all' ? undefined : filters.status,
                method: filters.method === 'all' ? undefined : filters.method,
                _q: filters._q.trim() || undefined,
                dateFrom: filters.dateFrom || undefined,
                dateTo: filters.dateTo || undefined,
            },
            responseType: 'blob',
        });
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = issueOnly ? 'mollie-payment-issues.csv' : 'mollie-payments.csv';
        link.click();
        URL.revokeObjectURL(url);
    }, [filters]);

    const onPreviousPage = useCallback(() => {
        loadPayments(filters, Math.max(page - 1, 1));
    }, [filters, loadPayments, page]);

    const onNextPage = useCallback(() => {
        loadPayments(filters, Math.min(page + 1, totalPages));
    }, [filters, loadPayments, page, totalPages]);

    const problemCount = useMemo(
        () => payments.filter((payment) => issueStatuses.includes(payment.status)).length,
        [payments],
    );

    return {
        filters,
        setFilters,
        payments,
        total,
        page,
        totalPages,
        isLoading,
        isSyncing,
        error,
        syncMessage,
        problemCount,
        onApplyFilters,
        onResetFilters,
        onSyncPayments,
        onExport,
        onPreviousPage,
        onNextPage,
    };
};

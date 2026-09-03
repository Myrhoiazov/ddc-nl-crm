import { useCallback, useEffect, useMemo, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';

export interface FailedPaymentCustomer {
    id: number;
    email?: string;
    givenName?: string;
    familyName?: string;
}

export interface FailedPayment {
    id: number;
    mollieId?: string;
    status: string;
    amountValue: number;
    amountCurrency: string;
    description?: string;
    updatedAt: string;
    customer?: FailedPaymentCustomer | null;
}

export interface MollieDashboardSummary {
    totalCustomers: number;
    activeSubscriptions: number;
    validMandates: number;
    paidThisMonth: number;
    failedPayments: number;
    monthlyRevenue: number;
    currency: string;
    latestFailedPayments: FailedPayment[];
}

interface SyncResult {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
}

type FullSyncResult = Record<'customers' | 'mandates' | 'subscriptions' | 'payments', SyncResult>;

export type RevenueChartPeriod = 'year' | 'threeMonths' | 'month' | 'week';

export interface RevenueChartItem {
    key: string;
    label: string;
    income: number;
    expense: number;
}

export interface RevenueChartData {
    period: RevenueChartPeriod;
    updatedAt: string;
    incomeTotal: number;
    expenseTotal: number;
    balance: number;
    items: RevenueChartItem[];
}

const formatFullSyncResult = (result: FullSyncResult) => {
    const total = Object.values(result).reduce(
        (sum, item) => ({
            created: sum.created + item.created,
            updated: sum.updated + item.updated,
            skipped: sum.skipped + item.skipped,
            errors: sum.errors + item.errors,
        }),
        { created: 0, updated: 0, skipped: 0, errors: 0 },
    );

    return `Sync: создано ${total.created}, обновлено ${total.updated}, пропущено ${total.skipped}, ошибок ${total.errors}`;
};

export const useHomePageData = () => {
    const [summary, setSummary] = useState<MollieDashboardSummary>();
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [chartPeriod, setChartPeriod] = useState<RevenueChartPeriod>('week');
    const [chartData, setChartData] = useState<RevenueChartData>();
    const [isChartLoading, setIsChartLoading] = useState(false);
    const [error, setError] = useState<string>();
    const [syncMessage, setSyncMessage] = useState<string>();

    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        setError(undefined);

        try {
            const { data } = await $apiPrivate.get<MollieDashboardSummary>(
                '/mollie/dashboard/summary',
            );
            setSummary(data);
        } catch (e) {
            setError('Не удалось загрузить Mollie summary');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    const fetchRevenueChart = useCallback(async (period: RevenueChartPeriod) => {
        setIsChartLoading(true);

        try {
            const { data } = await $apiPrivate.get<RevenueChartData>('/transactions/chart', {
                params: {
                    period,
                },
            });

            setChartData(data);
        } finally {
            setIsChartLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRevenueChart(chartPeriod);
    }, [chartPeriod, fetchRevenueChart]);

    const onSyncMollie = useCallback(async () => {
        setIsSyncing(true);
        setError(undefined);
        setSyncMessage(undefined);

        try {
            const { data } = await $apiPrivate.post<FullSyncResult>('/mollie/sync');
            await fetchSummary();
            setSyncMessage(formatFullSyncResult(data));
        } catch (e) {
            setError('Не удалось синхронизировать Mollie');
        } finally {
            setIsSyncing(false);
        }
    }, [fetchSummary]);

    const onExportMonthlyRevenue = useCallback(async () => {
        const response = await $apiPrivate.get('/transactions/revenue/export.csv', {
            responseType: 'blob',
        });
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'monthly-revenue.csv';
        link.click();
        URL.revokeObjectURL(url);
    }, []);

    const maxChartValue = useMemo(() => {
        const values = chartData?.items.flatMap((item) => [item.income, item.expense]) ?? [];
        const maxValue = Math.max(...values, 0);

        return maxValue || 1;
    }, [chartData]);

    return {
        summary,
        isLoading,
        isSyncing,
        chartPeriod,
        setChartPeriod,
        chartData,
        isChartLoading,
        error,
        syncMessage,
        maxChartValue,
        onSyncMollie,
        onExportMonthlyRevenue,
    };
};

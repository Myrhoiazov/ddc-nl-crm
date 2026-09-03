import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { SelectOption } from '@/shared/ui/Select/Select';

export interface MatrixMonth {
    key: string;
    label: string;
    year: number;
    month: number;
}

export interface MatrixCell {
    paid: boolean;
    paidCount: number;
    issueCount: number;
    amount: number;
    currency: string;
}

export interface MatrixRow {
    key: string;
    clientId: number | null;
    customerId: number | null;
    name: string;
    payerNames: string[];
    branch: string | null;
    cells: Record<string, MatrixCell>;
    paidMonths: number;
}

interface PaymentsMatrixResponse {
    startYear: number;
    endYear: number;
    months: MatrixMonth[];
    rows: MatrixRow[];
}

export interface UpcomingSubscription {
    id: number;
    mollieId?: string;
    description: string;
    amountValue: string | number;
    amountCurrency: string;
    interval: string;
    nextPaymentDate: string;
    mandate?: {
        mollieId?: string;
        status: string;
        method: string;
    } | null;
    customer: {
        id: number;
        payerName?: string;
        givenName?: string;
        familyName?: string;
        email?: string;
        client?: { id: number; firstName?: string; lastName?: string } | null;
        clientLinks?: Array<{ client?: { id: number; firstName?: string; lastName?: string } | null }>;
    };
}

interface UpcomingSubscriptionsResponse {
    items: UpcomingSubscription[];
    total: number;
    amount: number;
    currency: string;
}

export type PeriodMode = 'year' | 'month' | 'range';

const now = new Date();
const defaultStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
export const yearOptions = Array.from({ length: 7 }, (_, index) => defaultStartYear + 1 - index).map((year) => ({
    value: String(year),
    content: `${year} / ${year + 1}`,
}));
export const periodModeOptions: SelectOption<PeriodMode>[] = [
    { value: 'year', content: 'Весь учебный год' },
    { value: 'month', content: 'Один месяц' },
    { value: 'range', content: 'Период' },
];

export const formatAmount = (cell: MatrixCell) => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: cell.currency || 'EUR',
    maximumFractionDigits: 0,
}).format(cell.amount);
export const formatCurrency = (value: string | number, currency = 'EUR') => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
}).format(Number(value));
const currentMonthKey = now.toISOString().slice(0, 7);

export const useMolliePaymentsMatrix = () => {
    const [data, setData] = useState<PaymentsMatrixResponse>();
    const [upcoming, setUpcoming] = useState<UpcomingSubscriptionsResponse>();
    const [startYear, setStartYear] = useState(String(defaultStartYear));
    const [search, setSearch] = useState('');
    const [periodMode, setPeriodMode] = useState<PeriodMode>('year');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [monthFrom, setMonthFrom] = useState('');
    const [monthTo, setMonthTo] = useState('');
    const [upcomingMonth, setUpcomingMonth] = useState(currentMonthKey);
    const [isLoading, setIsLoading] = useState(false);
    const [isUpcomingLoading, setIsUpcomingLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState(false);
    const [upcomingReloadKey, setUpcomingReloadKey] = useState(0);

    const loadMatrix = useCallback(async () => {
        setIsLoading(true);
        setError(false);

        try {
            const response = await $apiPrivate.get<PaymentsMatrixResponse>('/mollie/payments/matrix', {
                params: { startYear },
            });
            setData(response.data);
        } catch {
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [startYear]);

    useEffect(() => {
        loadMatrix();
    }, [loadMatrix]);

    useEffect(() => {
        const loadUpcoming = async () => {
            const [year, month] = upcomingMonth.split('-').map(Number);

            if (!year || !month) return;

            setIsUpcomingLoading(true);
            const dateFrom = `${upcomingMonth}-01`;
            const dateTo = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

            try {
                const response = await $apiPrivate.get<UpcomingSubscriptionsResponse>('/mollie/subscriptions/upcoming', {
                    params: { dateFrom, dateTo },
                });
                setUpcoming(response.data);
            } catch {
                setUpcoming(undefined);
            } finally {
                setIsUpcomingLoading(false);
            }
        };

        loadUpcoming();
    }, [upcomingMonth, upcomingReloadKey]);

    const onSync = useCallback(async () => {
        setIsSyncing(true);

        try {
            await Promise.all([
                $apiPrivate.post('/mollie/sync/payments'),
                $apiPrivate.post('/mollie/sync/subscriptions'),
            ]);
            await loadMatrix();
            setUpcomingReloadKey((value) => value + 1);
            toast.success('Матрица платежей обновлена');
        } catch {
            toast.error('Не удалось синхронизировать платежи');
        } finally {
            setIsSyncing(false);
        }
    }, [loadMatrix]);

    const rows = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase();

        if (!normalizedSearch) return data?.rows ?? [];

        return data?.rows.filter((row) => (
            [row.name, row.branch, ...row.payerNames]
                .filter(Boolean)
                .some((value) => value?.toLocaleLowerCase().includes(normalizedSearch))
        )) ?? [];
    }, [data?.rows, search]);

    const monthOptions = useMemo(() => data?.months.map((month) => ({
        value: month.key,
        content: `${month.label} ${month.year}`,
    })) ?? [], [data?.months]);
    const visibleMonths = useMemo(() => {
        if (!data?.months.length || periodMode === 'year') return data?.months ?? [];
        if (periodMode === 'month') {
            return data.months.filter((month) => month.key === (selectedMonth || data.months[0].key));
        }

        const from = monthFrom || data.months[0].key;
        const to = monthTo || data.months[data.months.length - 1].key;
        const normalizedFrom = from <= to ? from : to;
        const normalizedTo = from <= to ? to : from;

        return data.months.filter((month) => month.key >= normalizedFrom && month.key <= normalizedTo);
    }, [data?.months, monthFrom, monthTo, periodMode, selectedMonth]);
    const getPaidMonths = useCallback((row: MatrixRow) => (
        visibleMonths.filter((month) => row.cells[month.key]?.paid).length
    ), [visibleMonths]);
    const paidStudents = rows.filter((row) => getPaidMonths(row) > 0).length;
    const totalPaidMonths = rows.reduce((total, row) => total + getPaidMonths(row), 0);
    const upcomingMonthOptions = useMemo(() => {
        const matrixOptions = monthOptions.some((option) => option.value === currentMonthKey)
            ? monthOptions
            : [{ value: currentMonthKey, content: now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) }, ...monthOptions];

        return matrixOptions;
    }, [monthOptions]);

    return {
        data,
        upcoming,
        startYear, setStartYear,
        search, setSearch,
        periodMode, setPeriodMode,
        selectedMonth, setSelectedMonth,
        monthFrom, setMonthFrom,
        monthTo, setMonthTo,
        upcomingMonth, setUpcomingMonth,
        isLoading,
        isUpcomingLoading,
        isSyncing,
        error,
        onSync,
        rows,
        monthOptions,
        visibleMonths,
        getPaidMonths,
        paidStudents,
        totalPaidMonths,
        upcomingMonthOptions,
    };
};

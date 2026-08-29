import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { $apiPrivate } from '@/shared/api/api';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { Input } from '@/shared/ui/Input/Input';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import s from './MolliePayments.module.scss';

type PaymentStatusFilter = 'all' | 'paid' | 'failed' | 'canceled' | 'expired' | 'pending' | 'open';
type PaymentMethodFilter = 'all' | 'directdebit' | 'creditcard' | 'ideal' | 'banktransfer' | 'paypal' | 'unknown';

interface MolliePaymentCustomer {
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

interface MolliePaymentSubscription {
    id: number;
    mollieId?: string;
    status?: string;
    description?: string;
}

interface MolliePayment {
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

interface PaymentFilters {
    _q: string;
    status: PaymentStatusFilter;
    method: PaymentMethodFilter;
    issueOnly: boolean;
    dateFrom: string;
    dateTo: string;
}

const PAGE_SIZE = 25;

const defaultFilters: PaymentFilters = {
    _q: '',
    status: 'all',
    method: 'all',
    issueOnly: false,
    dateFrom: '',
    dateTo: '',
};

const statusOptions: SelectOption<PaymentStatusFilter>[] = [
    { value: 'all', content: 'Все статусы' },
    { value: 'paid', content: 'Paid' },
    { value: 'failed', content: 'Failed' },
    { value: 'canceled', content: 'Canceled' },
    { value: 'expired', content: 'Expired' },
    { value: 'pending', content: 'Pending' },
    { value: 'open', content: 'Open' },
];

const methodOptions: SelectOption<PaymentMethodFilter>[] = [
    { value: 'all', content: 'Все методы' },
    { value: 'directdebit', content: 'Direct debit' },
    { value: 'creditcard', content: 'Credit card' },
    { value: 'ideal', content: 'iDEAL' },
    { value: 'banktransfer', content: 'Bank transfer' },
    { value: 'paypal', content: 'PayPal' },
    { value: 'unknown', content: 'Unknown' },
];

const issueStatuses = ['failed', 'canceled', 'expired', 'charged_back', 'chargeback'];

const formatAmount = (payment: MolliePayment) => {
    const amount = Number(payment.amountValue ?? 0);

    return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: payment.amountCurrency || 'EUR',
    }).format(Number.isFinite(amount) ? amount : 0);
};

const formatDate = (value?: string) => {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const getCustomerName = (customer?: MolliePaymentCustomer) => {
    if (!customer) {
        return 'Клиент не привязан';
    }

    return customer.payerName
        || [customer.givenName, customer.familyName].filter(Boolean).join(' ')
        || customer.email
        || customer.mollieId
        || 'Без имени';
};

const getCrmClientName = (customer?: MolliePaymentCustomer) => {
    const crmClient = customer?.clientLinks?.[0]?.client || customer?.client;

    if (!crmClient) {
        return '';
    }

    return [crmClient.firstName, crmClient.lastName].filter(Boolean).join(' ')
        || crmClient.email
        || `Ученик #${crmClient.id}`;
};

const getStudentLinks = (customer?: MolliePaymentCustomer) => (
    customer?.clientLinks?.length
        ? customer.clientLinks
        : customer?.client?.id
            ? [{ id: customer.client.id, client: customer.client }]
            : []
);

export const MolliePayments = memo(() => {
    const { t } = useTranslation('home');
    const [filters, setFilters] = useState<PaymentFilters>(defaultFilters);
    const [payments, setPayments] = useState<MolliePayment[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string>();

    const firstItemNumber = total ? (page - 1) * PAGE_SIZE + 1 : 0;
    const lastItemNumber = Math.min(page * PAGE_SIZE, total);

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

    const pagination = total > 0 ? (
        <div className={s.pagination}>
            <span>{firstItemNumber}-{lastItemNumber} из {total}</span>
            <div className={s.paginationActions}>
                <Button theme={ButtonTheme.CLEAR} className={s.pageButton} onClick={onPreviousPage} disabled={isLoading || page <= 1}>
                    ←
                </Button>
                <span>{page} / {totalPages}</span>
                <Button theme={ButtonTheme.CLEAR} className={s.pageButton} onClick={onNextPage} disabled={isLoading || page >= totalPages}>
                    →
                </Button>
            </div>
        </div>
    ) : null;

    return (
        <VStack gap="16" max className={s.MolliePayments}>
            <HStack max justify="between" align="center" gap="16" className={s.header}>
                <div>
                    <Text title="Mollie Payments" size="m" bold />
                    <Text text={`Проблем на этой странице: ${problemCount}`} size="s" className={s.subtitle} />
                </div>
                <HStack gap="8" wrap="wrap" className={s.headerActions}>
                    <Button className={s.compactButton} theme={ButtonTheme.OUTLINE} onClick={() => onExport(false)}>Платежи CSV</Button>
                    <Button className={s.compactButton} theme={ButtonTheme.OUTLINE} onClick={() => onExport(true)}>Проблемы CSV</Button>
                    <Button className={s.compactButton} theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onSyncPayments} disabled={isSyncing}>
                        {isSyncing ? 'Sync...' : 'Sync'}
                    </Button>
                </HStack>
            </HStack>
            {syncMessage && <Text text={syncMessage} size="s" className={s.subtitle} />}

            <div className={s.filters}>
                <Input
                    className={s.filterInput}
                    label="Поиск"
                    placeholder="ID, описание, клиент, email"
                    value={filters._q}
                    onChange={(value) => setFilters((prev) => ({ ...prev, _q: value }))}
                    fullWidth
                />
                <Select<PaymentStatusFilter>
                    className={s.filterSelect}
                    label="Статус"
                    value={filters.status}
                    options={statusOptions}
                    onChange={(value) => setFilters((prev) => ({ ...prev, status: value, issueOnly: false }))}
                />
                <Select<PaymentMethodFilter>
                    className={s.filterSelect}
                    label="Метод"
                    value={filters.method}
                    options={methodOptions}
                    onChange={(value) => setFilters((prev) => ({ ...prev, method: value }))}
                />
                <Input
                    className={s.filterInput}
                    label="С даты"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(value) => setFilters((prev) => ({ ...prev, dateFrom: value }))}
                    fullWidth
                />
                <Input
                    className={s.filterInput}
                    label="До даты"
                    type="date"
                    value={filters.dateTo}
                    onChange={(value) => setFilters((prev) => ({ ...prev, dateTo: value }))}
                    fullWidth
                />
                <div className={s.filterActions}>
                    <Button
                        className={s.compactButton}
                        theme={filters.issueOnly ? ButtonTheme.BACKGROUND_INVERTED : ButtonTheme.OUTLINE}
                        onClick={() => setFilters((prev) => ({ ...prev, issueOnly: !prev.issueOnly, status: 'all' }))}
                    >
                        Проблемные
                    </Button>
                    <Button className={s.compactButton} theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onApplyFilters} disabled={isLoading}>
                        Применить
                    </Button>
                    <Button className={`${s.compactButton} ${s.resetButton}`} theme={ButtonTheme.OUTLINE} onClick={onResetFilters} disabled={isLoading}>
                        Сбросить
                    </Button>
                </div>
            </div>

            {pagination}

            {error && (
                <Card padding="24" fullWidth className={s.stateCard}>
                    <Text title="Не удалось загрузить платежи" text="Проверьте сервер или попробуйте синхронизировать Mollie payments." size="m" />
                </Card>
            )}

            {isLoading && !payments.length && (
                <VStack gap="16" max>
                    <Skeleton width="100%" height={72} border="14px" />
                    <Skeleton width="100%" height={72} border="14px" />
                    <Skeleton width="100%" height={72} border="14px" />
                </VStack>
            )}

            {!isLoading && !error && !payments.length && (
                <Card padding="24" fullWidth className={s.stateCard}>
                    <Text title="Платежи не найдены" text="Нажмите Sync payments или измените фильтры." size="m" />
                </Card>
            )}

            {!!payments.length && (
                <div className={s.table}>
                    <div className={s.tableHeader}>
                        <span>Платёж</span>
                        <span>Плательщик / ученик</span>
                        <span>Сумма</span>
                        <span>Статус</span>
                        <span>Дата</span>
                        <span>Подписка</span>
                    </div>
                    {payments.map((payment) => (
                        <div className={s.tableRow} key={payment.id}>
                            <div className={s.paymentCell}>
                                <span className={s.primaryText}>{payment.description || payment.mollieId || `#${payment.id}`}</span>
                                <span className={s.mutedText}>{payment.method || 'unknown'} · {payment.mollieId || 'no Mollie ID'}</span>
                            </div>
                            <div className={s.paymentCell}>
                                {payment.customer?.id ? (
                                    <Link className={s.link} to={`/mollie/customers/${payment.customer.id}`}>
                                        {getCustomerName(payment.customer)}
                                    </Link>
                                ) : (
                                    <span className={s.primaryText}>{getCustomerName(payment.customer)}</span>
                                )}
                                <span className={s.mutedText}>{payment.customer?.email || payment.customer?.mollieId || '—'}</span>
                                {getStudentLinks(payment.customer).map((link) => (
                                    link.client?.id ? (
                                        <Link className={s.link} to={`/clients/${link.client.id}`} key={link.id}>
                                            Ученик: {[link.client.firstName, link.client.lastName].filter(Boolean).join(' ') || link.client.email || `#${link.client.id}`}
                                        </Link>
                                    ) : null
                                ))}
                            </div>
                            <span className={s.amount}>{formatAmount(payment)}</span>
                            <span className={s.statusWrapper}>
                                <span className={`${s.status} ${issueStatuses.includes(payment.status) ? s.issue : s[payment.status] || ''}`}>
                                    {payment.status}
                                </span>
                            </span>
                            <span className={s.primaryText}>{formatDate(payment.paidAt || payment.createdAt)}</span>
                            <span className={s.mutedText}>{payment.subscription?.mollieId || '—'}</span>
                        </div>
                    ))}
                </div>
            )}

            {pagination}
        </VStack>
    );
});

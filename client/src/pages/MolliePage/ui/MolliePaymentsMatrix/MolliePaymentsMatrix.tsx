import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { Card } from '@/shared/ui/Card/Card';
import { Input } from '@/shared/ui/Input/Input';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import s from './MolliePaymentsMatrix.module.scss';

interface MatrixMonth {
    key: string;
    label: string;
    year: number;
    month: number;
}

interface MatrixCell {
    paid: boolean;
    paidCount: number;
    issueCount: number;
    amount: number;
    currency: string;
}

interface MatrixRow {
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

interface UpcomingSubscription {
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

type PeriodMode = 'year' | 'month' | 'range';

const now = new Date();
const defaultStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
const yearOptions = Array.from({ length: 7 }, (_, index) => defaultStartYear + 1 - index).map((year) => ({
    value: String(year),
    content: `${year} / ${year + 1}`,
}));
const periodModeOptions: SelectOption<PeriodMode>[] = [
    { value: 'year', content: 'Весь учебный год' },
    { value: 'month', content: 'Один месяц' },
    { value: 'range', content: 'Период' },
];

const formatAmount = (cell: MatrixCell) => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: cell.currency || 'EUR',
    maximumFractionDigits: 0,
}).format(cell.amount);
const formatCurrency = (value: string | number, currency = 'EUR') => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
}).format(Number(value));
const currentMonthKey = now.toISOString().slice(0, 7);

export const MolliePaymentsMatrix = memo(() => {
    const { t } = useTranslation();
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
    const tableStyle = {
        gridTemplateColumns: `minmax(250px, 1.7fr) repeat(${visibleMonths.length}, minmax(92px, 0.7fr)) minmax(88px, 0.6fr)`,
    };
    const tableMinWidth = Math.max(520 + visibleMonths.length * 92, 720);
    const upcomingMonthOptions = useMemo(() => {
        const matrixOptions = monthOptions.some((option) => option.value === currentMonthKey)
            ? monthOptions
            : [{ value: currentMonthKey, content: now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) }, ...monthOptions];

        return matrixOptions;
    }, [monthOptions]);
    const getUpcomingStudent = (subscription: UpcomingSubscription) => (
        subscription.customer.client
        || subscription.customer.clientLinks?.map((link) => link.client).find(Boolean)
    );
    const getPayerName = (subscription: UpcomingSubscription) => (
        subscription.customer.payerName
        || [subscription.customer.givenName, subscription.customer.familyName].filter(Boolean).join(' ')
        || subscription.customer.email
        || `Плательщик #${subscription.customer.id}`
    );

    return (
        <VStack gap="16" max className={s.matrixPage}>
            <HStack max justify="between" align="center" gap="16" className={s.header}>
                <div>
                    <Text title="Матрица платежей" size="m" bold />
                    <Text
                        text="Оплаты учеников по месяцам учебного года. Аналог DDC Payments Matrix."
                        size="s"
                        className={s.subtitle}
                    />
                </div>
                <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onSync} disabled={isSyncing}>
                    {isSyncing ? 'Sync...' : 'Sync payments'}
                </Button>
            </HStack>

            <div className={s.toolbar}>
                <Select
                    label="Учебный год"
                    value={startYear}
                    options={yearOptions}
                    onChange={setStartYear}
                />
                <Select<PeriodMode>
                    label="Просмотр"
                    value={periodMode}
                    options={periodModeOptions}
                    onChange={setPeriodMode}
                />
                {periodMode === 'month' && (
                    <Select
                        label="Месяц"
                        value={selectedMonth || data?.months[0]?.key}
                        options={monthOptions}
                        onChange={setSelectedMonth}
                    />
                )}
                {periodMode === 'range' && (
                    <>
                        <Select
                            label="С месяца"
                            value={monthFrom || data?.months[0]?.key}
                            options={monthOptions}
                            onChange={setMonthFrom}
                        />
                        <Select
                            label="По месяц"
                            value={monthTo || data?.months[data.months.length - 1]?.key}
                            options={monthOptions}
                            onChange={setMonthTo}
                        />
                    </>
                )}
                <Input
                    label="Поиск"
                    placeholder="Ученик, плательщик или филиал"
                    value={search}
                    onChange={setSearch}
                    fullWidth
                />
                <div className={s.summary}>
                    <span><b>{visibleMonths.length}</b>{t(' мес.')}</span>
                    <span><b>{rows.length}</b>{t(' строк')}</span>
                    <span><b>{paidStudents}</b>{t(' с оплатами')}</span>
                    <span><b>{totalPaidMonths}</b>{t(' оплаченных месяцев')}</span>
                </div>
            </div>

            <Card padding="16" fullWidth className={s.upcomingCard}>
                <VStack gap="16" max>
                    <HStack max justify="between" align="center" gap="16" className={s.upcomingHeader}>
                        <div>
                            <Text title="Предстоящие списания" size="m" bold />
                            <Text text="Ближайшие даты активных Mollie subscriptions." size="s" className={s.subtitle} />
                        </div>
                        <Select
                            label="Месяц списания"
                            value={upcomingMonth}
                            options={upcomingMonthOptions}
                            onChange={setUpcomingMonth}
                        />
                    </HStack>

                    <div className={s.upcomingSummary}>
                        <span><b>{upcoming?.total ?? 0}</b>{t(' списаний')}</span>
                        <span><b>{formatCurrency(upcoming?.amount ?? 0, upcoming?.currency)}</b>{t(' ожидается')}</span>
                    </div>

                    {isUpcomingLoading ? (
                        <Skeleton width="100%" height={76} border="12px" />
                    ) : upcoming?.items.length ? (
                        <div className={s.upcomingList}>
                            {upcoming.items.map((subscription) => {
                                const student = getUpcomingStudent(subscription);

                                return (
                                    <div className={s.upcomingRow} key={subscription.id}>
                                        <div className={s.upcomingIdentity}>
                                            {student?.id ? (
                                                <Link className={s.personLink} to={`/clients/${student.id}`}>
                                                    {[student.firstName, student.lastName].filter(Boolean).join(' ') || `Ученик #${student.id}`}
                                                </Link>
                                            ) : (
                                                <Link className={s.personLink} to={`/mollie/customers/${subscription.customer.id}`}>
                                                    {getPayerName(subscription)}
                                                </Link>
                                            )}
                                            <Link className={s.personMetaLink} to={`/mollie/customers/${subscription.customer.id}`}>
                                                {t('Плательщик: {{name}}', { name: getPayerName(subscription) })}
                                            </Link>
                                        </div>
                                        <span>{new Date(subscription.nextPaymentDate).toLocaleDateString('nl-NL')}</span>
                                        <span className={s.upcomingAmount}>{formatCurrency(subscription.amountValue, subscription.amountCurrency)}</span>
                                        <span className={s.personMeta}>{subscription.description}</span>
                                        <span className={`${s.mandateStatus} ${subscription.mandate?.status === 'valid' ? s.valid : s.invalid}`}>
                                            {subscription.mandate?.status || 'no mandate'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={s.empty}>{t('В выбранном месяце предстоящих списаний нет.')}</div>
                    )}
                </VStack>
            </Card>

            {error && (
                <Card padding="24" fullWidth className={s.stateCard}>
                    <Text title="Не удалось загрузить матрицу" text="Проверьте сервер или синхронизируйте Mollie payments." size="m" />
                </Card>
            )}

            {isLoading && !data && <Skeleton width="100%" height={420} border="16px" />}

            {!isLoading && !error && data && (
                <div className={s.tableViewport}>
                    <div className={s.table} style={{ minWidth: tableMinWidth }}>
                        <div className={`${s.row} ${s.tableHeader}`} style={tableStyle}>
                            <div className={`${s.personCell} ${s.stickyCell}`}>{t('Ученик / плательщик')}</div>
                            {visibleMonths.map((month) => (
                                <div className={s.monthHeader} key={month.key}>
                                    <span>{month.label}</span>
                                    <small>{month.year}</small>
                                </div>
                            ))}
                            <div className={s.totalHeader}>{t('Оплачено')}</div>
                        </div>

                        {rows.map((row) => (
                            <div className={s.row} key={row.key} style={tableStyle}>
                                <div className={`${s.personCell} ${s.stickyCell}`}>
                                    {row.clientId ? (
                                        <Link className={s.personLink} to={`/clients/${row.clientId}`}>{row.name}</Link>
                                    ) : row.customerId ? (
                                        <Link className={s.personLink} to={`/mollie/customers/${row.customerId}`}>{row.name}</Link>
                                    ) : (
                                        <span className={s.personLink}>{row.name}</span>
                                    )}
                                    <span className={s.personMeta}>
                                        {row.payerNames.length ? `Плательщик: ${row.payerNames.join(', ')}` : 'Плательщик не привязан'}
                                    </span>
                                    {row.branch && <span className={s.personMeta}>{row.branch}</span>}
                                </div>

                                {visibleMonths.map((month) => {
                                    const cell = row.cells[month.key];
                                    const title = cell?.paid
                                        ? `${cell.paidCount} оплат · ${formatAmount(cell)}`
                                        : cell?.issueCount
                                            ? `${cell.issueCount} проблемных оплат`
                                            : 'Оплат нет';

                                    return (
                                        <div
                                            className={`${s.monthCell} ${cell?.paid ? s.paid : ''} ${cell?.issueCount ? s.issue : ''}`}
                                            key={month.key}
                                            title={title}
                                        >
                                            {cell?.paid ? (
                                                <>
                                                    <b>{t('✓')}</b>
                                                    <small>{formatAmount(cell)}</small>
                                                </>
                                            ) : cell?.issueCount ? (
                                                <b>!</b>
                                            ) : (
                                                <span>—</span>
                                            )}
                                        </div>
                                    );
                                })}

                                <div className={s.totalCell}>{getPaidMonths(row)}</div>
                            </div>
                        ))}

                        {!rows.length && (
                            <div className={s.empty}>{t('По выбранному фильтру ничего не найдено.')}</div>
                        )}
                    </div>
                </div>
            )}
        </VStack>
    );
});

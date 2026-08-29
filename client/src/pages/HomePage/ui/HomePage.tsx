import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Page } from '@/widgets/Page/Page';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Card } from '@/shared/ui/Card/Card';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { $apiPrivate } from '@/shared/api/api';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import cls from './HomePage.module.scss';

interface FailedPaymentCustomer {
    id: number;
    email?: string;
    givenName?: string;
    familyName?: string;
}

interface FailedPayment {
    id: number;
    mollieId?: string;
    status: string;
    amountValue: number;
    amountCurrency: string;
    description?: string;
    updatedAt: string;
    customer?: FailedPaymentCustomer | null;
}

interface MollieDashboardSummary {
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

type RevenueChartPeriod = 'year' | 'threeMonths' | 'month' | 'week';

interface RevenueChartItem {
    key: string;
    label: string;
    income: number;
    expense: number;
}

interface RevenueChartData {
    period: RevenueChartPeriod;
    updatedAt: string;
    incomeTotal: number;
    expenseTotal: number;
    balance: number;
    items: RevenueChartItem[];
}

const chartPeriodLabels: Record<RevenueChartPeriod, string> = {
    year: 'Год',
    threeMonths: '3 месяца',
    month: 'Месяц',
    week: 'Неделя',
};

const chartPeriods: RevenueChartPeriod[] = ['year', 'threeMonths', 'month', 'week'];

const formatMoney = (value: number, currency: string) =>
    new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency,
    }).format(value);

const formatShortAmount = (value: number) => (
    new Intl.NumberFormat('nl-NL', {
        maximumFractionDigits: value % 1 ? 1 : 0,
    }).format(value)
);

const formatUpdatedAt = (value?: string) => {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleTimeString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

const getCustomerName = (customer?: FailedPaymentCustomer | null) => {
    if (!customer) {
        return 'Клиент не привязан';
    }

    const fullName = [customer.givenName, customer.familyName].filter(Boolean).join(' ');

    return fullName || customer.email || `Customer #${customer.id}`;
};

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

const HomePage = () => {
    const { t } = useTranslation('home');
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

    const kpiCards = useMemo(
        () => [
            {
                label: 'Доход за месяц',
                value: summary ? formatMoney(summary.monthlyRevenue, summary.currency) : '-',
                accent: 'success',
            },
            {
                label: 'Оплат в этом месяце',
                value: String(summary?.paidThisMonth ?? 0),
                accent: 'primary',
            },
            {
                label: 'Активные подписки',
                value: String(summary?.activeSubscriptions ?? 0),
                accent: 'primary',
            },
            {
                label: 'Валидные мандаты',
                value: String(summary?.validMandates ?? 0),
                accent: 'primary',
            },
            {
                label: 'Проблемные оплаты',
                value: String(summary?.failedPayments ?? 0),
                accent: summary?.failedPayments ? 'danger' : 'success',
            },
            {
                label: 'Mollie customers',
                value: String(summary?.totalCustomers ?? 0),
                accent: 'primary',
            },
        ],
        [summary],
    );

    const maxChartValue = useMemo(() => {
        const values = chartData?.items.flatMap((item) => [item.income, item.expense]) ?? [];
        const maxValue = Math.max(...values, 0);

        return maxValue || 1;
    }, [chartData]);

    return (
        <Page>
            <VStack gap="24" className={cls.HomePage} max>
                <HStack justify="between" align="start" gap="16" max>
                    <VStack gap="8">
                        <Text title={t('CRM Dashboard')} size="l" bold />
                        <Text text="Обзор автосписаний Mollie и состояния учеников по оплатам." />
                        {syncMessage && <Text text={syncMessage} variant="accent" />}
                    </VStack>
                    <Button
                        onClick={onSyncMollie}
                        disabled={isSyncing || isLoading}
                        theme={ButtonTheme.BACKGROUND_INVERTED}
                    >
                        {isSyncing ? 'Синхронизация...' : 'Sync Mollie'}
                    </Button>
                </HStack>

                {isLoading ? (
                    <HStack gap="16" wrap="wrap" max>
                        <Skeleton width={260} height={120} border="12px" />
                        <Skeleton width={260} height={120} border="12px" />
                        <Skeleton width={260} height={120} border="12px" />
                        <Skeleton width={260} height={120} border="12px" />
                    </HStack>
                ) : (
                    <HStack gap="16" wrap="wrap" max align="stretch">
                        {kpiCards.map((card) => (
                            <Card
                                key={card.label}
                                className={`${cls.kpiCard} ${cls[card.accent]}`}
                                padding="24"
                                shadow="shadowLight"
                            >
                                <VStack gap="8">
                                    <Text text={card.label} size="s" className={cls.kpiLabel} />
                                    <Text title={card.value} size="m" bold />
                                </VStack>
                            </Card>
                        ))}
                    </HStack>
                )}

                {error && <Text text={error} variant="error" />}

                <Card padding="24" max shadow="shadowLight" className={`${cls.sectionCard} ${cls.revenueCard}`}>
                    <VStack gap="16" max>
                        <HStack justify="between" align="start" max className={cls.chartHeader}>
                            <VStack gap="16">
                                <Text title="Доход и расход по месяцам" size="m" bold />
                                <div className={cls.periodTabs}>
                                    {chartPeriods.map((period) => (
                                        <button
                                            key={period}
                                            type="button"
                                            className={`${cls.periodTab} ${chartPeriod === period ? cls.activePeriodTab : ''}`}
                                            onClick={() => setChartPeriod(period)}
                                        >
                                            {chartPeriodLabels[period]}
                                        </button>
                                    ))}
                                </div>
                            </VStack>

                            <VStack gap="16" className={cls.chartMeta}>
                                <Button theme={ButtonTheme.OUTLINE} onClick={onExportMonthlyRevenue}>
                                    {t('CSV по месяцам')}
                                </Button>
                                <HStack gap="8" align="center">
                                    <span className={`${cls.legendDot} ${cls.incomeDot}`} />
                                    <Text text="Доход" size="s" />
                                    <span className={`${cls.legendDot} ${cls.expenseDot}`} />
                                    <Text text="Расход" size="s" />
                                </HStack>
                                <div className={cls.chartTotals}>
                                    <span>{t('Доход: {{amount}}', { amount: formatMoney(chartData?.incomeTotal ?? 0, 'EUR') })}</span>
                                    <span>{t('Расход: {{amount}}', { amount: formatMoney(chartData?.expenseTotal ?? 0, 'EUR') })}</span>
                                </div>
                                <HStack gap="8" align="center">
                                    <span className={cls.updatedDot} />
                                    <Text text={`Обновлено: ${formatUpdatedAt(chartData?.updatedAt)}`} size="s" className={cls.updatedText} />
                                </HStack>
                            </VStack>
                        </HStack>

                        {isChartLoading && !chartData ? (
                            <Skeleton width="100%" height={220} border="12px" />
                        ) : (
                            <div className={cls.chartArea}>
                                {(chartData?.items ?? []).map((item) => (
                                    <div key={item.key} className={cls.chartColumn}>
                                        <div className={cls.bars}>
                                            <div className={cls.barGroup}>
                                                <span className={cls.barValue}>{formatShortAmount(item.income)}</span>
                                                <div
                                                    className={`${cls.bar} ${cls.incomeBar}`}
                                                    style={{ height: `${Math.max((item.income / maxChartValue) * 180, item.income ? 14 : 3)}px` }}
                                                />
                                            </div>
                                            <div className={cls.barGroup}>
                                                <span className={cls.barValue}>{formatShortAmount(item.expense)}</span>
                                                <div
                                                    className={`${cls.bar} ${cls.expenseBar}`}
                                                    style={{ height: `${Math.max((item.expense / maxChartValue) * 180, item.expense ? 14 : 3)}px` }}
                                                />
                                            </div>
                                        </div>
                                        <span className={cls.chartLabel}>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </VStack>
                </Card>

                <Card padding="24" max shadow="shadowLight" className={cls.sectionCard}>
                    <VStack gap="16" max>
                        <HStack justify="between" align="center" max>
                            <Text title="Последние проблемные списания" size="m" bold />
                            <HStack gap="16" align="center">
                                <Text text={`${summary?.failedPayments ?? 0} total`} />
                                <Link className={cls.incidentsLink} to="/mollie/incidents">
                                    {t('Открыть все проблемы')}
                                </Link>
                            </HStack>
                        </HStack>

                        {!summary?.latestFailedPayments?.length ? (
                            <Text text="Проблемных автосписаний нет — касса танцует ровно." />
                        ) : (
                            <VStack gap="8" max>
                                {summary.latestFailedPayments.map((payment) => (
                                    <HStack
                                        key={payment.id}
                                        className={cls.failedPayment}
                                        justify="between"
                                        gap="16"
                                        max
                                    >
                                        <VStack gap="4">
                                            <Text
                                                text={`${getCustomerName(payment.customer)} · ${payment.status}`}
                                                bold
                                            />
                                            <Text
                                                text={
                                                    [
                                                        payment.description,
                                                        !payment.customer && payment.mollieId,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ') || '-'
                                                }
                                                size="s"
                                            />
                                        </VStack>
                                        <Text
                                            text={formatMoney(
                                                payment.amountValue,
                                                payment.amountCurrency || summary.currency,
                                            )}
                                            bold
                                        />
                                    </HStack>
                                ))}
                            </VStack>
                        )}
                    </VStack>
                </Card>
            </VStack>
        </Page>
    );
};

export default HomePage;

import { memo, useMemo } from 'react';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Card } from '@/shared/ui/Card/Card';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { MollieDashboardSummary } from '../useHomePageData';
import cls from './HomePage.module.scss';

const formatMoney = (value: number, currency: string) =>
    new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency,
    }).format(value);

interface HomePageKpiCardsProps {
    summary?: MollieDashboardSummary;
    isLoading: boolean;
}

export const HomePageKpiCards = memo(({ summary, isLoading }: HomePageKpiCardsProps) => {
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

    if (isLoading) {
        return (
            <HStack gap="16" wrap="wrap" max>
                <Skeleton width={260} height={120} border="12px" />
                <Skeleton width={260} height={120} border="12px" />
                <Skeleton width={260} height={120} border="12px" />
                <Skeleton width={260} height={120} border="12px" />
            </HStack>
        );
    }

    return (
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
    );
});

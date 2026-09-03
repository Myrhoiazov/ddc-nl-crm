import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { useMolliePayments } from './useMolliePayments';
import { MolliePaymentsFilters } from './MolliePaymentsFilters';
import { MolliePaymentsPagination } from './MolliePaymentsPagination';
import { MolliePaymentsTable } from './MolliePaymentsTable';
import s from './MolliePayments.module.scss';

export const MolliePayments = memo(() => {
    const { t } = useTranslation('home');
    const {
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
    } = useMolliePayments();

    const pagination = (
        <MolliePaymentsPagination
            page={page}
            totalPages={totalPages}
            total={total}
            isLoading={isLoading}
            onPreviousPage={onPreviousPage}
            onNextPage={onNextPage}
        />
    );

    return (
        <VStack gap="16" max className={s.MolliePayments}>
            <HStack max justify="between" align="center" gap="16" className={s.header}>
                <div>
                    <Text title="Mollie Payments" size="m" bold />
                    <Text text={`Проблем на этой странице: ${problemCount}`} size="s" className={s.subtitle} />
                </div>
                <HStack gap="8" wrap="wrap" className={s.headerActions}>
                    <Button className={s.compactButton} theme={ButtonTheme.OUTLINE} onClick={() => onExport(false)}>{t('Платежи CSV')}</Button>
                    <Button className={s.compactButton} theme={ButtonTheme.OUTLINE} onClick={() => onExport(true)}>{t('Проблемы CSV')}</Button>
                    <Button className={s.compactButton} theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onSyncPayments} disabled={isSyncing}>
                        {isSyncing ? 'Sync...' : 'Sync'}
                    </Button>
                </HStack>
            </HStack>
            {syncMessage && <Text text={syncMessage} size="s" className={s.subtitle} />}

            <MolliePaymentsFilters
                filters={filters}
                setFilters={setFilters}
                isLoading={isLoading}
                onApplyFilters={onApplyFilters}
                onResetFilters={onResetFilters}
            />

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

            {!!payments.length && <MolliePaymentsTable payments={payments} />}

            {pagination}
        </VStack>
    );
});

import { memo } from 'react';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { useMollieIncidents } from './useMollieIncidents';
import { MollieIncidentsFilters } from './MollieIncidentsFilters';
import { MollieIncidentsSummary } from './MollieIncidentsSummary';
import { MollieIncidentsPagination } from './MollieIncidentsPagination';
import { MollieIncidentCard } from './MollieIncidentCard';
import s from './MollieIncidents.module.scss';

export const MollieIncidents = memo(() => {
    const {
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
    } = useMollieIncidents();

    const pagination = (
        <MollieIncidentsPagination
            page={page}
            totalPages={totalPages}
            total={total}
            isLoading={isLoading}
            onPreviousPage={onPreviousPage}
            onNextPage={onNextPage}
        />
    );

    return (
        <VStack gap="16" max className={s.MollieIncidents}>
            <HStack max justify="between" align="center">
                <div>
                    <Text title="Payment Incidents" size="m" bold />
                    <Text text="Проблемные автосписания, подписки без valid mandate и неполные профили клиентов." size="s" className={s.subtitle} />
                </div>
                <Button
                    theme={ButtonTheme.BACKGROUND_INVERTED}
                    onClick={onSyncPayments}
                    disabled={isSyncing}
                >
                    {isSyncing ? 'Sync...' : 'Sync payments'}
                </Button>
            </HStack>
            {syncMessage && <Text text={syncMessage} size="s" className={s.subtitle} />}

            <MollieIncidentsSummary summaryCards={summaryCards} />

            <MollieIncidentsFilters
                filters={filters}
                setFilters={setFilters}
                isLoading={isLoading}
                onApplyFilters={onApplyFilters}
                onResetFilters={onResetFilters}
            />

            {pagination}

            {error && (
                <Card padding="24" fullWidth className={s.stateCard}>
                    <Text title="Не удалось загрузить проблемы" text="Проверьте сервер или попробуйте синхронизировать Mollie payments." size="m" />
                </Card>
            )}

            {isLoading && !incidents.length && (
                <VStack gap="16" max>
                    <Skeleton width="100%" height={104} border="14px" />
                    <Skeleton width="100%" height={104} border="14px" />
                    <Skeleton width="100%" height={104} border="14px" />
                </VStack>
            )}

            {!isLoading && !error && !incidents.length && (
                <Card padding="24" fullWidth className={s.stateCard}>
                    <Text title="Проблем нет" text="Красота: автосписания и профили выглядят спокойно." size="m" />
                </Card>
            )}

            {!!incidents.length && (
                <VStack gap="16" max>
                    {incidents.map((incident) => (
                        <MollieIncidentCard
                            key={incident.id}
                            incident={incident}
                            isResolving={resolvingIncidentId === incident.id}
                            onResolve={onResolveIncident}
                        />
                    ))}
                </VStack>
            )}

            {pagination}
        </VStack>
    );
});

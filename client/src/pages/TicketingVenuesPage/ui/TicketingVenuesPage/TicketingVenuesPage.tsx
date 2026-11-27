import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { StateView } from '@/shared/ui/StateView';
import s from './TicketingVenuesPage.module.scss';
import { CreateVenueForm } from './CreateVenueForm';
import { SeatMapPreview } from './SeatMapPreview';
import { VenueCard } from './VenueCard';
import { useTicketingVenues } from './useTicketingVenues';

const VenuesContent = () => {
    const { t } = useTranslation();
    const { venues, seatMap, isLoading, loadError, actionError, addVenue, addSeatMap, openSeatMap, ...seatMapActions } = useTicketingVenues();

    if (isLoading) return <Skeleton width="100%" height={240} border="14px" />;
    if (loadError) {
        return <StateView tone="error" title={t('Не удалось загрузить площадки')} text={t('Проверьте соединение с сервером.')} />;
    }

    return (
        <>
            {actionError && <span className={s.error}>{t('Не удалось выполнить действие. Попробуйте ещё раз.')}</span>}
            {venues.length === 0 && <StateView title={t('Площадок пока нет')} text={t('Добавьте первую площадку ниже.')} />}
            {venues.map((venue) => (
                <VenueCard
                    key={venue.id}
                    venue={venue}
                    openSeatMapId={seatMap?.id ?? null}
                    onOpenSeatMap={openSeatMap}
                    onCreateSeatMap={addSeatMap}
                />
            ))}
            {seatMap && (
                // key: выделение мест не переносится на другую схему.
                <SeatMapPreview
                    key={seatMap.id}
                    seatMap={seatMap}
                    onPublish={seatMapActions.publish}
                    onClone={seatMapActions.clone}
                    onChangeSeats={seatMapActions.changeSeats}
                />
            )}
            <CreateVenueForm onSubmit={addVenue} />
        </>
    );
};

const TicketingVenuesPage = memo(() => {
    const { t } = useTranslation();

    return (
        <Page>
            <VStack max gap="24" className={s.page}>
                <div>
                    <Text title={t('Залы')} size="l" bold />
                    <Text
                        text={t('Площадки и схемы зала для продажи билетов. Схема собирается из категорий: сколько рядов и мест в ряду.')}
                        size="s"
                        className={s.subtitle}
                    />
                </div>
                <VenuesContent />
            </VStack>
        </Page>
    );
});

export default TicketingVenuesPage;

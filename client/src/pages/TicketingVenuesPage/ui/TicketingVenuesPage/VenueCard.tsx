import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './TicketingVenuesPage.module.scss';
import { SeatMapForm } from './SeatMapForm';
import type { NewSeatMap, SeatMapSummary, Venue } from './ticketingVenuesApi';

interface SeatMapRowProps {
    seatMap: SeatMapSummary;
    isOpen: boolean;
    onOpen: (seatMapId: number) => void;
}

const SeatMapRow = memo(({ seatMap, isOpen, onOpen }: SeatMapRowProps) => {
    const { t } = useTranslation();
    const isPublished = seatMap.status === 'PUBLISHED';

    return (
        <li className={classNames(s.seatMapRow, { [s.seatMapRowActive]: isOpen })}>
            <button type="button" className={s.seatMapLink} onClick={() => onOpen(seatMap.id)}>
                {seatMap.name}
            </button>
            <span className={s.muted}>
                {t('версия {{version}} · мест: {{count}}', { version: seatMap.version, count: seatMap._count.seats })}
            </span>
            <span className={classNames(s.status, { [s.statusPublished]: isPublished })}>
                {isPublished ? t('Опубликована') : t('Черновик')}
            </span>
        </li>
    );
});

interface VenueCardProps {
    venue: Venue;
    openSeatMapId: number | null;
    onOpenSeatMap: (seatMapId: number) => void;
    onCreateSeatMap: (venueId: number, seatMap: NewSeatMap) => Promise<boolean>;
}

export const VenueCard = memo(({ venue, openSeatMapId, onOpenSeatMap, onCreateSeatMap }: VenueCardProps) => {
    const { t } = useTranslation();
    const [isFormOpen, setIsFormOpen] = useState(false);

    const handleCreate = useCallback(async (seatMap: NewSeatMap) => {
        const created = await onCreateSeatMap(venue.id, seatMap);
        if (created) setIsFormOpen(false);
        return created;
    }, [onCreateSeatMap, venue.id]);

    return (
        <section className={s.card}>
            <div className={s.previewHeader}>
                <div>
                    <h2 className={s.cardTitle}>{venue.name}</h2>
                    <span className={s.muted}>{[venue.city, venue.address].filter(Boolean).join(', ')}</span>
                </div>
                <Button onClick={() => setIsFormOpen((open) => !open)}>
                    {isFormOpen ? t('Отмена') : t('Новая схема зала')}
                </Button>
            </div>
            {venue.seatMaps.length === 0 && !isFormOpen && (
                <span className={s.muted}>{t('Схем зала пока нет.')}</span>
            )}
            <ul className={s.seatMapList}>
                {venue.seatMaps.map((seatMap) => (
                    <SeatMapRow key={seatMap.id} seatMap={seatMap} isOpen={seatMap.id === openSeatMapId} onOpen={onOpenSeatMap} />
                ))}
            </ul>
            {isFormOpen && <SeatMapForm onSubmit={handleCreate} />}
        </section>
    );
});

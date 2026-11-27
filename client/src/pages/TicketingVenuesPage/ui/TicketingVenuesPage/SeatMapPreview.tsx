import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { SeatMapCanvas } from '@/entities/TicketSeatMap';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './TicketingVenuesPage.module.scss';
import type { SeatMapDetail } from './ticketingVenuesApi';

interface SeatMapPreviewProps {
    seatMap: SeatMapDetail;
    onPublish: (seatMapId: number) => void;
}

export const SeatMapPreview = memo(({ seatMap, onPublish }: SeatMapPreviewProps) => {
    const { t } = useTranslation();
    const isDraft = seatMap.status === 'DRAFT';

    return (
        <section className={s.card}>
            <div className={s.previewHeader}>
                <div>
                    <h2 className={s.cardTitle}>{seatMap.name}</h2>
                    <span className={s.muted}>
                        {t('версия {{version}} · мест: {{count}}', { version: seatMap.version, count: seatMap.seats.length })}
                    </span>
                </div>
                <span className={classNames(s.status, { [s.statusPublished]: !isDraft })}>
                    {isDraft ? t('Черновик') : t('Опубликована')}
                </span>
            </div>
            <SeatMapCanvas canvas={seatMap.canvas} categories={seatMap.categories} seats={seatMap.seats} />
            {isDraft && (
                <div className={s.formActions}>
                    <span className={s.muted}>{t('После публикации схему нельзя изменить — только создать новую версию.')}</span>
                    <Button theme={ButtonTheme.BACKGROUND} onClick={() => onPublish(seatMap.id)}>
                        {t('Опубликовать схему')}
                    </Button>
                </div>
            )}
        </section>
    );
});

import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SeatMapCanvas, type SeatState } from '@/entities/TicketSeatMap';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './TicketingVenuesPage.module.scss';
import { SeatEditToolbar } from './SeatEditToolbar';
import type { SeatChange, SeatMapDetail } from './ticketingVenuesApi';

const blockedSeatStates = (seatMap: SeatMapDetail): Record<number, SeatState> => (
    Object.fromEntries(seatMap.seats.filter((seat) => seat.isDefaultBlocked).map((seat) => [seat.id, 'BLOCKED']))
);

const toggleSeat = (selected: ReadonlySet<number>, seatId: number): ReadonlySet<number> => {
    const next = new Set(selected);
    if (!next.delete(seatId)) next.add(seatId);
    return next;
};

const SeatMapHeader = memo(({ seatMap }: { seatMap: SeatMapDetail }) => {
    const { t } = useTranslation();
    const isDraft = seatMap.status === 'DRAFT';
    const blocked = seatMap.seats.filter((seat) => seat.isDefaultBlocked).length;

    return (
        <div className={s.previewHeader}>
            <div>
                <h2 className={s.cardTitle}>{seatMap.name}</h2>
                <span className={s.muted}>
                    {t('версия {{version}} · мест: {{count}}', { version: seatMap.version, count: seatMap.seats.length })}
                    {blocked > 0 && ` · ${t('закрыто для продажи: {{blocked}}', { blocked })}`}
                </span>
            </div>
            <span className={classNames(s.status, { [s.statusPublished]: !isDraft })}>
                {isDraft ? t('Черновик') : t('Опубликована')}
            </span>
        </div>
    );
});

interface SeatMapFooterProps {
    seatMap: SeatMapDetail;
    onPublish: (seatMapId: number) => void;
    onClone: (seatMapId: number) => void;
}

const SeatMapFooter = memo(({ seatMap, onPublish, onClone }: SeatMapFooterProps) => {
    const { t } = useTranslation();

    if (seatMap.status !== 'DRAFT') {
        return (
            <div className={s.formActions}>
                <span className={s.muted}>{t('Опубликованную схему изменить нельзя. Новая версия — её копия-черновик.')}</span>
                <Button onClick={() => onClone(seatMap.id)}>{t('Создать новую версию')}</Button>
            </div>
        );
    }
    return (
        <div className={s.formActions}>
            <span className={s.muted}>{t('После публикации схему нельзя изменить — только создать новую версию.')}</span>
            <Button theme={ButtonTheme.BACKGROUND} onClick={() => onPublish(seatMap.id)}>
                {t('Опубликовать схему')}
            </Button>
        </div>
    );
});

interface SeatMapPreviewProps extends SeatMapFooterProps {
    onChangeSeats: (seatMapId: number, seatIds: number[], change: SeatChange) => Promise<boolean>;
}

export const SeatMapPreview = memo(({ seatMap, onPublish, onClone, onChangeSeats }: SeatMapPreviewProps) => {
    const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
    const isDraft = seatMap.status === 'DRAFT';
    const seatStates = useMemo(() => blockedSeatStates(seatMap), [seatMap]);
    const clearSelection = useCallback(() => setSelected(new Set()), []);
    const handleToggle = useCallback((seatId: number) => setSelected((current) => toggleSeat(current, seatId)), []);

    const handleApply = useCallback(async (change: SeatChange) => {
        const saved = await onChangeSeats(seatMap.id, Array.from(selected), change);
        if (saved) clearSelection();
    }, [onChangeSeats, seatMap.id, selected, clearSelection]);

    return (
        <section className={s.card}>
            <SeatMapHeader seatMap={seatMap} />
            <SeatMapCanvas
                canvas={seatMap.canvas}
                categories={seatMap.categories}
                seats={seatMap.seats}
                seatStates={seatStates}
                selectedSeatIds={isDraft ? selected : undefined}
                onSeatToggle={isDraft ? handleToggle : undefined}
            />
            {isDraft && (
                <SeatEditToolbar
                    selectedCount={selected.size}
                    categories={seatMap.categories}
                    onApply={handleApply}
                    onClear={clearSelection}
                />
            )}
            <SeatMapFooter seatMap={seatMap} onPublish={onPublish} onClone={onClone} />
        </section>
    );
});

import { CSSProperties, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './TicketingVenuesPage.module.scss';
import type { Seat, SeatCategory, SeatMapDetail } from './ticketingVenuesApi';

const DEFAULT_CANVAS = { width: 800, height: 400, seatSize: 28 };

// Цвет категории — слот категориальной палитры темы, а не сырой цвет.
const slotStyle = (colorSlot: number): CSSProperties => ({
    fill: `var(--style-${colorSlot}-bg-redesigned)`,
    stroke: `var(--style-${colorSlot}-text-redesigned)`,
    color: `var(--style-${colorSlot}-text-redesigned)`,
    background: `var(--style-${colorSlot}-bg-redesigned)`,
    borderColor: `var(--style-${colorSlot}-text-redesigned)`,
});

interface SeatShapeProps {
    seat: Seat;
    size: number;
    category?: SeatCategory;
}

const SeatShape = memo(({ seat, size, category }: SeatShapeProps) => (
    <rect
        className={s.seat}
        x={seat.x}
        y={seat.y}
        width={size}
        height={size}
        rx={6}
        style={slotStyle(category?.colorSlot ?? 1)}
    >
        <title>{`${category?.name ?? ''} · ${seat.rowLabel}-${seat.seatLabel}`}</title>
    </rect>
));

const SeatMapLegend = memo(({ seatMap }: { seatMap: SeatMapDetail }) => (
        <ul className={s.legend}>
            {seatMap.categories.map((category) => (
                <li key={category.id} className={s.legendItem} style={slotStyle(category.colorSlot)}>
                    {category.name}
                    {' · '}
                    {seatMap.seats.filter((seat) => seat.categoryId === category.id).length}
                </li>
            ))}
        </ul>
));

interface SeatMapPreviewProps {
    seatMap: SeatMapDetail;
    onPublish: (seatMapId: number) => void;
}

export const SeatMapPreview = memo(({ seatMap, onPublish }: SeatMapPreviewProps) => {
    const { t } = useTranslation();
    const canvas = seatMap.canvas ?? DEFAULT_CANVAS;
    const categoryById = useMemo(
        () => new Map(seatMap.categories.map((category) => [category.id, category])),
        [seatMap.categories],
    );
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
            <SeatMapLegend seatMap={seatMap} />
            <div className={s.canvasScroll}>
                <div className={s.stage}>{t('Сцена')}</div>
                <svg
                    className={s.canvas}
                    viewBox={`0 0 ${canvas.width} ${canvas.height}`}
                    width={canvas.width}
                    role="img"
                    aria-label={t('Схема зала')}
                >
                    {seatMap.seats.map((seat) => (
                        <SeatShape key={seat.id} seat={seat} size={canvas.seatSize} category={categoryById.get(seat.categoryId)} />
                    ))}
                </svg>
            </div>
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

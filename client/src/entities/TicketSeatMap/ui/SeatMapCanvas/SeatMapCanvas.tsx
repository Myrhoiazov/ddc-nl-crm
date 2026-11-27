import { CSSProperties, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './SeatMapCanvas.module.scss';
import type { SeatCanvasSize, SeatCategory, SeatPosition, SeatState } from '../../model/types/seatMap';

const DEFAULT_CANVAS: SeatCanvasSize = { width: 800, height: 400, seatSize: 28 };

// Цвет категории — слот категориальной палитры темы, а не сырой цвет.
const categoryStyle = (colorSlot: number): CSSProperties => ({
    fill: `var(--style-${colorSlot}-bg-redesigned)`,
    stroke: `var(--style-${colorSlot}-text-redesigned)`,
    color: `var(--style-${colorSlot}-text-redesigned)`,
    background: `var(--style-${colorSlot}-bg-redesigned)`,
    borderColor: `var(--style-${colorSlot}-text-redesigned)`,
});

const STATE_CLASS: Record<SeatState, string | undefined> = {
    AVAILABLE: undefined,
    HELD: cls.held,
    SOLD: cls.sold,
    BLOCKED: cls.blocked,
};

interface SeatShapeProps {
    seat: SeatPosition;
    size: number;
    category?: SeatCategory;
    state?: SeatState;
    stateLabel?: string;
}

const SeatShape = memo(({ seat, size, category, state = 'AVAILABLE', stateLabel }: SeatShapeProps) => (
    <rect
        className={classNames(cls.seat, {}, [STATE_CLASS[state]])}
        x={seat.x}
        y={seat.y}
        width={size}
        height={size}
        rx={6}
        // Состояние задаёт цвет классом; цвет категории нужен только свободному месту.
        style={state === 'AVAILABLE' ? categoryStyle(category?.colorSlot ?? 1) : undefined}
    >
        <title>{[category?.name, `${seat.rowLabel}-${seat.seatLabel}`, stateLabel].filter(Boolean).join(' · ')}</title>
    </rect>
));

interface SeatMapLegendProps {
    categories: SeatCategory[];
    seats: SeatPosition[];
}

const SeatMapLegend = memo(({ categories, seats }: SeatMapLegendProps) => (
    <ul className={cls.legend}>
        {categories.map((category) => (
            <li key={category.id} className={cls.legendItem} style={categoryStyle(category.colorSlot)}>
                {category.name}
                {' · '}
                {seats.filter((seat) => seat.categoryId === category.id).length}
            </li>
        ))}
    </ul>
));

interface SeatMapCanvasProps {
    className?: string;
    canvas: SeatCanvasSize | null;
    categories: SeatCategory[];
    seats: SeatPosition[];
    // Состояния мест сеанса; без них все места рисуются свободными (просмотр схемы).
    seatStates?: Record<number, SeatState>;
}

export const SeatMapCanvas = memo(({ className, canvas, categories, seats, seatStates }: SeatMapCanvasProps) => {
    const { t } = useTranslation();
    const size = canvas ?? DEFAULT_CANVAS;
    const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
    const stateLabels: Record<SeatState, string> = {
        AVAILABLE: t('свободно'),
        HELD: t('удержано'),
        SOLD: t('продано'),
        BLOCKED: t('заблокировано'),
    };

    return (
        <div className={classNames(cls.SeatMapCanvas, {}, [className])}>
            <SeatMapLegend categories={categories} seats={seats} />
            <div className={cls.scroll}>
                <div className={cls.stage}>{t('Сцена')}</div>
                <svg className={cls.svg} viewBox={`0 0 ${size.width} ${size.height}`} width={size.width} role="img" aria-label={t('Схема зала')}>
                    {seats.map((seat) => (
                        <SeatShape
                            key={seat.id}
                            seat={seat}
                            size={size.seatSize}
                            category={categoryById.get(seat.categoryId)}
                            state={seatStates?.[seat.id]}
                            stateLabel={seatStates ? stateLabels[seatStates[seat.id] ?? 'AVAILABLE'] : undefined}
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
});

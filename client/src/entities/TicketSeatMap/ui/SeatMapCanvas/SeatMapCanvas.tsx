import { CSSProperties, KeyboardEvent, memo, useMemo } from 'react';
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

// Выделение рисуется поверх цвета категории или состояния.
const SELECTED_STYLE: CSSProperties = { stroke: 'var(--primary-redesigned)', strokeWidth: 3.5 };

const seatStyle = (state: SeatState, isSelected: boolean, colorSlot = 1): CSSProperties => ({
    // Состояние задаёт цвет классом; цвет категории нужен только свободному месту.
    ...(state === 'AVAILABLE' ? categoryStyle(colorSlot) : {}),
    ...(isSelected ? SELECTED_STYLE : {}),
});

// Кликабельное место — флажок: доступно с клавиатуры и читается скринридером.
const toggleProps = (seatId: number, isSelected: boolean, onToggle?: (seatId: number) => void) => {
    if (!onToggle) return {};
    return {
        role: 'checkbox',
        tabIndex: 0,
        'aria-checked': isSelected,
        onClick: () => onToggle(seatId),
        onKeyDown: (event: KeyboardEvent) => {
            if (event.key !== ' ' && event.key !== 'Enter') return;
            event.preventDefault();
            onToggle(seatId);
        },
    };
};

interface SeatShapeProps {
    seat: SeatPosition;
    size: number;
    category?: SeatCategory;
    state?: SeatState;
    stateLabel?: string;
    isSelected?: boolean;
    onToggle?: (seatId: number) => void;
}

const SeatShape = memo((props: SeatShapeProps) => {
    const { seat, size, category, state = 'AVAILABLE', stateLabel, isSelected = false, onToggle } = props;
    const label = [category?.name, `${seat.rowLabel}-${seat.seatLabel}`, stateLabel].filter(Boolean).join(' · ');

    return (
        <rect
            className={classNames(cls.seat, { [cls.interactive]: Boolean(onToggle) }, [STATE_CLASS[state]])}
            x={seat.x}
            y={seat.y}
            width={size}
            height={size}
            rx={6}
            style={seatStyle(state, isSelected, category?.colorSlot)}
            aria-label={label}
            {...toggleProps(seat.id, isSelected, onToggle)}
        >
            <title>{label}</title>
        </rect>
    );
});

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
    // Режим выбора мест: клик по месту переключает его в выделении.
    selectedSeatIds?: ReadonlySet<number>;
    onSeatToggle?: (seatId: number) => void;
}

export const SeatMapCanvas = memo((props: SeatMapCanvasProps) => {
    const { className, canvas, categories, seats, seatStates, selectedSeatIds, onSeatToggle } = props;
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
                            stateLabel={seatStates?.[seat.id] && stateLabels[seatStates[seat.id]]}
                            isSelected={selectedSeatIds?.has(seat.id)}
                            onToggle={onSeatToggle}
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
});

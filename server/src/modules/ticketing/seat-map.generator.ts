// Генератор рядов: превращает блоки «категория × ряды × мест в ряду» в категории и места с
// координатами. Чистая функция — без I/O.

export interface SeatBlockInput {
    categoryName: string;
    rows: number;
    seatsPerRow: number;
}

export interface GeneratedCategory {
    code: string;
    name: string;
    colorSlot: number;
    sortOrder: number;
}

export interface GeneratedSeat {
    categoryCode: string;
    rowLabel: string;
    seatLabel: string;
    x: number;
    y: number;
}

export interface GeneratedSeatMap {
    categories: GeneratedCategory[];
    seats: GeneratedSeat[];
    canvas: { width: number; height: number; seatSize: number };
}

export const SEAT_PITCH = 40;
const SEAT_SIZE = 28;
export const MAX_SEATS_PER_MAP = 2000;
const COLOR_SLOTS = 8;
const CANVAS_PADDING = 40;

export const countSeats = (blocks: SeatBlockInput[]): number => (
    blocks.reduce((total, block) => total + block.rows * block.seatsPerRow, 0)
);

const buildCategory = (block: SeatBlockInput, index: number): GeneratedCategory => ({
    code: `C${index + 1}`,
    name: block.categoryName.trim(),
    colorSlot: (index % COLOR_SLOTS) + 1,
    sortOrder: index,
});

// Ряды короче самого широкого центрируются, чтобы зал выглядел симметрично.
const buildRowSeats = (
    row: { categoryCode: string; rowNumber: number; seatsPerRow: number },
    widestRow: number,
): GeneratedSeat[] => {
    const offset = Math.round(((widestRow - row.seatsPerRow) * SEAT_PITCH) / 2);
    return Array.from({ length: row.seatsPerRow }, (_, seatIndex) => ({
        categoryCode: row.categoryCode,
        rowLabel: String(row.rowNumber),
        seatLabel: String(seatIndex + 1),
        x: CANVAS_PADDING + offset + seatIndex * SEAT_PITCH,
        y: CANVAS_PADDING + (row.rowNumber - 1) * SEAT_PITCH,
    }));
};

const expandRows = (blocks: SeatBlockInput[], categories: GeneratedCategory[]) => {
    let rowNumber = 0;
    return blocks.flatMap((block, blockIndex) => Array.from({ length: block.rows }, () => {
        rowNumber += 1;
        return { categoryCode: categories[blockIndex].code, rowNumber, seatsPerRow: block.seatsPerRow };
    }));
};

export const generateSeatMap = (blocks: SeatBlockInput[]): GeneratedSeatMap => {
    const categories = blocks.map(buildCategory);
    const rows = expandRows(blocks, categories);
    const widestRow = Math.max(...blocks.map((block) => block.seatsPerRow));

    return {
        categories,
        seats: rows.flatMap((row) => buildRowSeats(row, widestRow)),
        canvas: {
            width: CANVAS_PADDING * 2 + widestRow * SEAT_PITCH,
            height: CANVAS_PADDING * 2 + rows.length * SEAT_PITCH,
            seatSize: SEAT_SIZE,
        },
    };
};

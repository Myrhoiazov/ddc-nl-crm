export interface SeatCategory {
    id: number;
    code: string;
    name: string;
    colorSlot: number;
}

export interface SeatPosition {
    id: number;
    categoryId: number;
    rowLabel: string;
    seatLabel: string;
    x: number;
    y: number;
    // Место закрыто для продажи в самой схеме: в инвентаре сеанса оно сразу BLOCKED.
    isDefaultBlocked?: boolean;
}

export interface SeatCanvasSize {
    width: number;
    height: number;
    seatSize: number;
}

export type SeatState = 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED';

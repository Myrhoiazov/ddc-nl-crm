import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SeatMapCanvas, type SeatState } from '@/entities/TicketSeatMap';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import s from './TicketingEventsPage.module.scss';
import { SessionStatusBadge } from './SessionStatusBadge';
import type { ManualSessionStatus, SessionDetail } from './ticketingEventsApi';
import { formatDateTime, formatMoney } from './ticketingFormat';

interface SessionActionsProps {
    session: SessionDetail;
    onPublish: (sessionId: number) => void;
    onChangeStatus: (sessionId: number, status: ManualSessionStatus) => void;
}

const SessionActions = memo(({ session, onPublish, onChangeStatus }: SessionActionsProps) => {
    const { t } = useTranslation();
    const { id, status } = session;

    return (
        <div className={s.actions}>
            {status === 'DRAFT' && (
                <Button theme={ButtonTheme.BACKGROUND} onClick={() => onPublish(id)}>{t('Открыть продажу')}</Button>
            )}
            {status === 'ON_SALE' && <Button onClick={() => onChangeStatus(id, 'PAUSED')}>{t('Поставить на паузу')}</Button>}
            {status === 'PAUSED' && (
                <Button theme={ButtonTheme.BACKGROUND} onClick={() => onChangeStatus(id, 'ON_SALE')}>{t('Возобновить продажу')}</Button>
            )}
            {(status === 'ON_SALE' || status === 'PAUSED') && (
                <Button theme={ButtonTheme.OUTLINE_RED} onClick={() => onChangeStatus(id, 'CLOSED')}>{t('Закрыть продажу')}</Button>
            )}
        </div>
    );
});

const SessionPrices = memo(({ session }: { session: SessionDetail }) => (
    <ul className={s.priceList}>
        {session.seatMap.categories.map((category) => {
            const price = session.prices.find((item) => item.categoryId === category.id);
            return (
                <li key={category.id} className={s.priceItem}>
                    {category.name}
                    {': '}
                    {price ? formatMoney(price.priceCents, session.currency) : '—'}
                </li>
            );
        })}
    </ul>
));

interface SessionPanelProps extends SessionActionsProps {
    session: SessionDetail;
}

export const SessionPanel = memo(({ session, onPublish, onChangeStatus }: SessionPanelProps) => {
    const { t } = useTranslation();
    const seatStates = useMemo(
        () => Object.fromEntries(session.seats.map((seat) => [seat.seatId, seat.status])) as Record<number, SeatState>,
        [session.seats],
    );
    const hasInventory = session.seats.length > 0;

    return (
        <section className={s.card}>
            <div className={s.cardHeader}>
                <div>
                    <h2 className={s.cardTitle}>{session.event.title}</h2>
                    <span className={s.muted}>{formatDateTime(session.startsAt)}</span>
                </div>
                <SessionStatusBadge status={session.status} />
            </div>
            <SessionPrices session={session} />
            {!hasInventory && (
                <span className={s.muted}>{t('Места появятся в продаже после открытия продажи.')}</span>
            )}
            <SeatMapCanvas
                canvas={session.seatMap.canvas}
                categories={session.seatMap.categories}
                seats={session.seatMap.seats}
                seatStates={hasInventory ? seatStates : undefined}
            />
            <SessionActions session={session} onPublish={onPublish} onChangeStatus={onChangeStatus} />
        </section>
    );
});

import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './TicketingEventsPage.module.scss';
import { SessionForm } from './SessionForm';
import { SessionStatusBadge } from './SessionStatusBadge';
import type { NewSession, SeatMapOption, SessionSummary, TicketEvent } from './ticketingEventsApi';
import { formatDateTime } from './ticketingFormat';

interface SessionRowProps {
    session: SessionSummary;
    isOpen: boolean;
    onOpen: (sessionId: number) => void;
}

const SessionRow = memo(({ session, isOpen, onOpen }: SessionRowProps) => {
    const { t } = useTranslation();
    const { SOLD = 0, HELD = 0, AVAILABLE = 0 } = session.seatCounts;

    return (
        <li className={classNames(s.sessionRow, { [s.sessionRowActive]: isOpen })}>
            <button type="button" className={s.sessionLink} onClick={() => onOpen(session.id)}>
                {formatDateTime(session.startsAt)}
            </button>
            <span className={s.muted}>{session.seatMap.venue.name}</span>
            <span className={s.muted}>
                {t('продано {{sold}} · удержано {{held}} · свободно {{available}}', { sold: SOLD, held: HELD, available: AVAILABLE })}
            </span>
            <SessionStatusBadge status={session.status} />
        </li>
    );
});

interface EventCardProps {
    event: TicketEvent;
    seatMaps: SeatMapOption[];
    openSessionId: number | null;
    onOpenSession: (sessionId: number) => void;
    onCreateSession: (eventId: number, session: NewSession) => Promise<boolean>;
}

export const EventCard = memo(({ event, seatMaps, openSessionId, onOpenSession, onCreateSession }: EventCardProps) => {
    const { t } = useTranslation();
    const [isFormOpen, setIsFormOpen] = useState(false);

    const handleCreate = useCallback(async (session: NewSession) => {
        const created = await onCreateSession(event.id, session);
        if (created) setIsFormOpen(false);
        return created;
    }, [onCreateSession, event.id]);

    return (
        <section className={s.card}>
            <div className={s.cardHeader}>
                <h2 className={s.cardTitle}>{event.title}</h2>
                <Button onClick={() => setIsFormOpen((open) => !open)}>
                    {isFormOpen ? t('Отмена') : t('Новый сеанс')}
                </Button>
            </div>
            {event.sessions.length === 0 && !isFormOpen && <span className={s.muted}>{t('Сеансов пока нет.')}</span>}
            <ul className={s.sessionList}>
                {event.sessions.map((session) => (
                    <SessionRow key={session.id} session={session} isOpen={session.id === openSessionId} onOpen={onOpenSession} />
                ))}
            </ul>
            {isFormOpen && <SessionForm seatMaps={seatMaps} onSubmit={handleCreate} />}
        </section>
    );
});

import { useCallback, useEffect, useState } from 'react';
import {
    fetchEvents,
    fetchPublishedSeatMaps,
    fetchSession,
    postEvent,
    postPublishSession,
    postSession,
    postSessionStatus,
    type ManualSessionStatus,
    type NewSession,
    type SeatMapOption,
    type SessionDetail,
    type TicketEvent,
} from './ticketingEventsApi';

const loadPageData = () => Promise.all([fetchEvents(), fetchPublishedSeatMaps()]);

type RunAction = (action: () => Promise<SessionDetail | void>) => Promise<boolean>;

const useEventActions = (runAction: RunAction) => {
    const addEvent = useCallback((title: string) => runAction(() => postEvent(title)), [runAction]);
    const addSession = useCallback(
        (eventId: number, input: NewSession) => runAction(() => postSession(eventId, input)),
        [runAction],
    );
    const openSession = useCallback((sessionId: number) => runAction(() => fetchSession(sessionId)), [runAction]);
    const publish = useCallback((sessionId: number) => runAction(() => postPublishSession(sessionId)), [runAction]);
    const changeStatus = useCallback(
        (sessionId: number, status: ManualSessionStatus) => runAction(() => postSessionStatus(sessionId, status)),
        [runAction],
    );

    return { addEvent, addSession, openSession, publish, changeStatus };
};

export const useTicketingEvents = () => {
    const [events, setEvents] = useState<TicketEvent[]>([]);
    const [seatMaps, setSeatMaps] = useState<SeatMapOption[]>([]);
    const [session, setSession] = useState<SessionDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [actionError, setActionError] = useState(false);

    const reload = useCallback(async () => {
        const [loadedEvents, loadedSeatMaps] = await loadPageData();
        setEvents(loadedEvents);
        setSeatMaps(loadedSeatMaps);
    }, []);

    useEffect(() => {
        reload()
            .catch(() => setLoadError(true))
            .finally(() => setIsLoading(false));
    }, [reload]);

    // Любое действие: сбросить прошлую ошибку, выполнить, обновить список; сбой — один флаг.
    const runAction = useCallback(async (action: () => Promise<SessionDetail | void>) => {
        setActionError(false);
        try {
            const result = await action();
            if (result) setSession(result);
            await reload();
            return true;
        } catch {
            setActionError(true);
            return false;
        }
    }, [reload]);

    const actions = useEventActions(runAction);

    return { events, seatMaps, session, isLoading, loadError, actionError, ...actions };
};

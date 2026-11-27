import { useCallback, useEffect, useState } from 'react';
import {
    fetchSeatMap,
    fetchVenues,
    postPublishSeatMap,
    postSeatMap,
    postVenue,
    type NewSeatMap,
    type NewVenue,
    type SeatMapDetail,
    type Venue,
} from './ticketingVenuesApi';

export const useTicketingVenues = () => {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [seatMap, setSeatMap] = useState<SeatMapDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [actionError, setActionError] = useState(false);

    const reload = useCallback(async () => {
        setVenues(await fetchVenues());
    }, []);

    useEffect(() => {
        reload()
            .catch(() => setLoadError(true))
            .finally(() => setIsLoading(false));
    }, [reload]);

    // Любое действие: сбросить прошлую ошибку, выполнить, обновить список; сбой — один флаг.
    const runAction = useCallback(async (action: () => Promise<SeatMapDetail | void>) => {
        setActionError(false);
        try {
            const result = await action();
            if (result) setSeatMap(result);
            await reload();
            return true;
        } catch {
            setActionError(true);
            return false;
        }
    }, [reload]);

    const addVenue = useCallback((venue: NewVenue) => runAction(() => postVenue(venue)), [runAction]);
    const addSeatMap = useCallback(
        (venueId: number, input: NewSeatMap) => runAction(() => postSeatMap(venueId, input)),
        [runAction],
    );
    const openSeatMap = useCallback((seatMapId: number) => runAction(() => fetchSeatMap(seatMapId)), [runAction]);
    const publish = useCallback((seatMapId: number) => runAction(() => postPublishSeatMap(seatMapId)), [runAction]);

    return { venues, seatMap, isLoading, loadError, actionError, addVenue, addSeatMap, openSeatMap, publish };
};

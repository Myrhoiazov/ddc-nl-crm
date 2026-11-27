import { useCallback, useEffect, useState } from 'react';
import {
    fetchSeatMap,
    fetchVenues,
    postCloneSeatMap,
    postPublishSeatMap,
    postSeatChange,
    postSeatMap,
    postVenue,
    type NewSeatMap,
    type NewVenue,
    type SeatChange,
    type SeatMapDetail,
    type Venue,
} from './ticketingVenuesApi';

type RunAction = (action: () => Promise<SeatMapDetail | void>) => Promise<boolean>;

const useVenueActions = (runAction: RunAction) => {
    const addVenue = useCallback((venue: NewVenue) => runAction(() => postVenue(venue)), [runAction]);
    const addSeatMap = useCallback(
        (venueId: number, input: NewSeatMap) => runAction(() => postSeatMap(venueId, input)),
        [runAction],
    );
    const openSeatMap = useCallback((seatMapId: number) => runAction(() => fetchSeatMap(seatMapId)), [runAction]);
    const publish = useCallback((seatMapId: number) => runAction(() => postPublishSeatMap(seatMapId)), [runAction]);
    const changeSeats = useCallback(
        (seatMapId: number, seatIds: number[], change: SeatChange) => runAction(() => postSeatChange(seatMapId, seatIds, change)),
        [runAction],
    );
    const clone = useCallback((seatMapId: number) => runAction(() => postCloneSeatMap(seatMapId)), [runAction]);

    return { addVenue, addSeatMap, openSeatMap, publish, changeSeats, clone };
};

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

    const actions = useVenueActions(runAction);

    return { venues, seatMap, isLoading, loadError, actionError, ...actions };
};

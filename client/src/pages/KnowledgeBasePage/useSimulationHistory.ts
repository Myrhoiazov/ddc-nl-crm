import { useCallback, useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { SimulationProvider } from './emailSimulationTypes';
import { SimulationRunDetail, SimulationRunSummary } from './simulationHistoryTypes';

const PAGE_SIZE = 20;

interface SimulationRunsResponse {
    items: SimulationRunSummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const useSimulationHistory = () => {
    const [runs, setRuns] = useState<SimulationRunSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [providerFilter, setProviderFilterState] = useState<'' | SimulationProvider>('');
    const [selectedRun, setSelectedRun] = useState<SimulationRunDetail | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await $apiPrivate.get<SimulationRunsResponse>('/ai-email/simulation-runs', {
                params: { _page: page, _limit: PAGE_SIZE, provider: providerFilter || undefined },
            });
            setRuns(response.data.items ?? []);
            setTotal(response.data.total ?? 0);
            setTotalPages(response.data.totalPages ?? 1);
        } finally {
            setLoading(false);
        }
    }, [page, providerFilter]);

    useEffect(() => { load(); }, [load]);

    const setProviderFilter = (value: '' | SimulationProvider) => {
        setProviderFilterState(value);
        setPage(1);
    };

    const openRun = async (id: number) => {
        const response = await $apiPrivate.get<SimulationRunDetail>(`/ai-email/simulation-runs/${id}`);
        setSelectedRun(response.data);
    };
    const closeRun = () => setSelectedRun(null);

    // Called after a fresh simulation run persists — jumps back to page 1 so the just-run
    // simulation is visible without a manual reload. setPage(1) alone would no-op via the load()
    // effect when already on page 1, so that case calls load() directly instead.
    const refresh = useCallback(() => {
        if (page !== 1) setPage(1);
        else load();
    }, [page, load]);

    return { runs, loading, page, setPage, total, totalPages, providerFilter, setProviderFilter, selectedRun, openRun, closeRun, refresh };
};

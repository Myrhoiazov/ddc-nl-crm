import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { $apiPrivate } from '@/shared/api/api';
import { useDebounce } from '@/shared/lib/hooks/useDebounce/useDebounce';
import { MollieClient } from '@/entities/MollieClient';
import { buildMollieCustomerOptions, MollieCustomersResponse } from './clientFormOptions';

const SEARCH_DEBOUNCE_MS = 300;

// The list is capped at 100 by the server, so the search has to run there —
// filtering the loaded page would miss every payer beyond it.
const fetchMollieCustomers = async (search: string) => {
    const { data } = await $apiPrivate.get<MollieCustomersResponse>('/mollie/customers', {
        params: { _page: 1, _limit: 100, ...(search ? { _q: search } : {}) },
    });
    return data.items ?? [];
};

// Keeps the chosen payer in the list when a later search no longer returns it,
// otherwise the <select> would silently fall back to its first option.
const pinSelectedCustomer = (
    customers: MollieClient[],
    selected: MollieClient | null,
    selectedId: string,
) => {
    if (!selected || String(selected.id) !== selectedId) return customers;
    if (customers.some((customer) => String(customer.id) === selectedId)) return customers;
    return [selected, ...customers];
};

const useMollieCustomers = () => {
    const [customers, setCustomers] = useState<MollieClient[]>([]);
    const lastRequest = useRef(0);

    const loadCustomers = useCallback((search: string) => {
        lastRequest.current += 1;
        const request = lastRequest.current;
        const applyResult = (items: MollieClient[]) => {
            if (request === lastRequest.current) setCustomers(items);
        };
        fetchMollieCustomers(search.trim()).then(applyResult).catch(() => applyResult([]));
    }, []);

    useEffect(() => {
        loadCustomers('');
    }, [loadCustomers]);

    return { customers, loadCustomers };
};

export const useMollieCustomerSearch = (selectedId: string, onSelect: (id: string) => void) => {
    const { t } = useTranslation();
    const { customers, loadCustomers } = useMollieCustomers();
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<MollieClient | null>(null);
    const debouncedLoad = useDebounce(loadCustomers, SEARCH_DEBOUNCE_MS);

    const onChangeSearch = useCallback((value: string) => {
        setSearch(value);
        debouncedLoad(value);
    }, [debouncedLoad]);

    const onSelectCustomer = useCallback((id: string) => {
        setSelected(customers.find((customer) => String(customer.id) === id) ?? null);
        onSelect(id);
    }, [customers, onSelect]);

    const options = useMemo(
        () => buildMollieCustomerOptions(pinSelectedCustomer(customers, selected, selectedId), t),
        [customers, selected, selectedId, t],
    );

    return {
        search, onChangeSearch, options, onSelectCustomer, isEmpty: Boolean(search.trim()) && !customers.length,
    };
};

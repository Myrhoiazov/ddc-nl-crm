import {
    KeyboardEvent, memo, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppRoutes, RoutePath } from '@/shared/config/routeConfig/routeConfig';
import { getRouteClientDetails, getRouteMollieDetails } from '@/shared/const/router';
import { classNames } from '@/shared/lib/classNames/classNames';
import { fetchGlobalSearch } from '../../model/services/fetchGlobalSearch/fetchGlobalSearch';
import {
    GlobalSearchResponse,
    SearchBranchHit,
    SearchCategoryKey,
    SearchChoreographerHit,
    SearchClientHit,
    SearchGroupHit,
    SearchPaymentHit,
    SearchTransactionHit,
} from '../../model/types/globalSearch';
import { GlobalSearchDropdown } from './GlobalSearchDropdown';
import cls from './GlobalSearch.module.scss';

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

export interface FlatResult {
    category: SearchCategoryKey;
    key: string;
    title: string;
    subtitle?: string;
    route: string;
}

const mapClientHit = (hit: SearchClientHit): FlatResult => ({
    category: 'clients',
    key: `clients-${hit.id}`,
    title: [hit.firstName, hit.lastName].filter(Boolean).join(' ') || hit.email || `Клиент #${hit.id}`,
    subtitle: [hit.phoneNumber, hit.email].filter(Boolean).join(' · ') || hit.branchName || undefined,
    route: getRouteClientDetails(String(hit.id)),
});

const mapPaymentHit = (hit: SearchPaymentHit): FlatResult => ({
    category: 'payments',
    key: `payments-${hit.id}`,
    title: hit.customerName || hit.mollieId || `Платёж #${hit.id}`,
    subtitle: `${hit.amountValue} ${hit.amountCurrency} · ${hit.status}`,
    route: getRouteMollieDetails(String(hit.customerId)),
});

const mapGroupHit = (hit: SearchGroupHit): FlatResult => ({
    category: 'groups',
    key: `groups-${hit.id}`,
    title: hit.name,
    subtitle: [hit.style, hit.level, hit.branchName].filter(Boolean).join(' · ') || undefined,
    route: `${RoutePath[AppRoutes.DANCE_GROUPS]}?highlight=${hit.id}`,
});

const mapChoreographerHit = (hit: SearchChoreographerHit): FlatResult => ({
    category: 'choreographers',
    key: `choreographers-${hit.id}`,
    title: `${hit.firstName} ${hit.lastName}`,
    subtitle: [hit.phone, hit.email].filter(Boolean).join(' · ') || undefined,
    route: RoutePath[AppRoutes.CHOREOGRAPHERS],
});

const mapBranchHit = (hit: SearchBranchHit): FlatResult => ({
    category: 'branches',
    key: `branches-${hit.id}`,
    title: hit.name,
    subtitle: [hit.city, hit.address].filter(Boolean).join(', ') || undefined,
    route: RoutePath[AppRoutes.BRANCHES],
});

const mapTransactionHit = (hit: SearchTransactionHit): FlatResult => ({
    category: 'transactions',
    key: `transactions-${hit.id}`,
    title: hit.description || `Транзакция #${hit.id}`,
    subtitle: `${hit.amount} · ${hit.category}`,
    route: RoutePath[AppRoutes.TRANSACTIONS],
});

// Порядок вывода категорий фиксирован (см. GLOBAL_SEARCH_SPEC.md, п.5) — внутри
// каждой категории результаты уже отсортированы backend'ом по релевантности.
const buildFlatResults = (data: GlobalSearchResponse | null): FlatResult[] => {
    if (!data) return [];

    return [
        ...data.clients.items.map(mapClientHit),
        ...data.payments.items.map(mapPaymentHit),
        ...data.groups.items.map(mapGroupHit),
        ...data.choreographers.items.map(mapChoreographerHit),
        ...data.branches.items.map(mapBranchHit),
        ...(data.transactions?.items ?? []).map(mapTransactionHit),
    ];
};

const groupByCategory = (results: FlatResult[]) => {
    const sections: { category: SearchCategoryKey; items: FlatResult[] }[] = [];
    results.forEach((result) => {
        const last = sections[sections.length - 1];
        if (last && last.category === result.category) {
            last.items.push(result);
        } else {
            sections.push({ category: result.category, items: [result] });
        }
    });
    return sections;
};

export const GlobalSearch = memo(() => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const [isExpanded, setIsExpanded] = useState(false);
    const [query, setQuery] = useState('');
    const [data, setData] = useState<GlobalSearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const flatResults = useMemo(() => buildFlatResults(data), [data]);
    const sections = useMemo(() => groupByCategory(flatResults), [flatResults]);
    const trimmedQuery = query.trim();
    const showDropdown = trimmedQuery.length >= MIN_QUERY_LENGTH;

    const closeSearch = useCallback(() => {
        abortRef.current?.abort();
        setIsExpanded(false);
        setQuery('');
        setData(null);
        setActiveIndex(-1);
        setLoading(false);
    }, []);

    const openSearch = useCallback(() => {
        setIsExpanded(true);
    }, []);

    const goTo = useCallback((route: string) => {
        navigate(route);
        closeSearch();
    }, [navigate, closeSearch]);

    useEffect(() => {
        if (isExpanded) inputRef.current?.focus();
    }, [isExpanded]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (trimmedQuery.length < MIN_QUERY_LENGTH) {
            abortRef.current?.abort();
            setData(null);
            setLoading(false);
            return undefined;
        }

        setLoading(true);
        debounceRef.current = setTimeout(() => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            fetchGlobalSearch(trimmedQuery, controller.signal)
                .then((response) => {
                    setData(response);
                    setActiveIndex(-1);
                })
                .catch((error) => {
                    if (controller.signal.aborted) return;
                    console.error('Global search failed:', error);
                    setData(null);
                })
                .finally(() => {
                    if (!controller.signal.aborted) setLoading(false);
                });
        }, DEBOUNCE_MS);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trimmedQuery]);

    useEffect(() => {
        if (!isExpanded) return undefined;

        const onMouseDown = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                closeSearch();
            }
        };

        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [isExpanded, closeSearch]);

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            closeSearch();
            return;
        }

        if (!flatResults.length) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((prev) => (prev + 1) % flatResults.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const target = flatResults[activeIndex >= 0 ? activeIndex : 0];
            if (target) goTo(target.route);
        }
    };

    return (
        <div ref={containerRef} className={classNames(cls.GlobalSearch, { [cls.expanded]: isExpanded }, [])}>
            {!isExpanded && (
                <button
                    type="button"
                    className={cls.iconButton}
                    onClick={openSearch}
                    aria-label={t('Поиск') as string}
                >
                    <span className={cls.icon}>{t('⌕')}</span>
                </button>
            )}
            {isExpanded && (
                <div className={cls.panel}>
                    <div className={cls.inputRow}>
                        <span className={cls.icon}>{t('⌕')}</span>
                        <input
                            ref={inputRef}
                            type="text"
                            className={cls.input}
                            placeholder={t('Поиск клиентов, платежей, групп…') as string}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={onKeyDown}
                        />
                        <button
                            type="button"
                            className={cls.closeButton}
                            onClick={closeSearch}
                            aria-label={t('Закрыть') as string}
                        >
                            ×
                        </button>
                    </div>

                    {showDropdown && (
                        <GlobalSearchDropdown
                            loading={loading}
                            data={data}
                            flatResults={flatResults}
                            sections={sections}
                            activeIndex={activeIndex}
                            onHover={setActiveIndex}
                            onSelect={goTo}
                        />
                    )}
                </div>
            )}
        </div>
    );
});

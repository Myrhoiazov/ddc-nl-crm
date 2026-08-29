import { useSelector } from 'react-redux';
import { useCallback } from 'react';
import {
    getClientsPageBranchId,
    getClientsPageOrder,
    getClientsPagePaymentStatus,
    getClientsPageSearch,
    getClientsPageSort,
} from '../../model/selectors/clientsPageSelectors';
import { useDebounce } from '@/shared/lib/hooks/useDebounce/useDebounce';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { ClientSortField } from '@/entities/Client';
import { SortOrder } from '@/shared/types/sort';
import { clientsPageActions } from '../../model/slices/clientsPageSlice';
import { fetchClientsList } from '../../model/services/fetchClientsList/fetchClientsList';
import { ClientPaymentStatusFilter } from '../../model/types/ClientPageSchema';

export function useClientFilters() {
    const search = useSelector(getClientsPageSearch);
    const sort = useSelector(getClientsPageSort);
    const order = useSelector(getClientsPageOrder);
    const branchId = useSelector(getClientsPageBranchId);
    const paymentStatus = useSelector(getClientsPagePaymentStatus);

    const dispatch = useAppDispatch();

    const fetchData = useCallback(() => {
        dispatch(fetchClientsList({ replace: true }));
    }, [dispatch]);

    const debouncedFetchData = useDebounce(fetchData, 500);

    const onChangeSearch = useCallback(
        (search: string) => {
            dispatch(clientsPageActions.setSearch(search));
            // dispatch(articlesPageActions.setPage(1));
            debouncedFetchData();
        },
        [dispatch, debouncedFetchData],
    );

    const onChangeSort = useCallback(
        (newSort: ClientSortField) => {
            dispatch(clientsPageActions.setSort(newSort));
            // dispatch(articlesPageActions.setPage(1));
            fetchData();
        },
        [dispatch, fetchData],
    );

    const onChangeOrder = useCallback(
        (newOrder: SortOrder) => {
            dispatch(clientsPageActions.setOrder(newOrder));
            // dispatch(articlesPageActions.setPage(1));
            fetchData();
        },
        [dispatch, fetchData],
    );

    const onChangeBranch = useCallback(
        (value: string) => {
            dispatch(clientsPageActions.setBranchId(value));
            // dispatch(articlesPageActions.setPage(1));
            fetchData();
        },
        [dispatch, fetchData],
    );

    const onChangePaymentStatus = useCallback(
        (value: ClientPaymentStatusFilter) => {
            dispatch(clientsPageActions.setPaymentStatus(value));
            fetchData();
        },
        [dispatch, fetchData],
    );

    return {
        search,
        sort,
        order,
        branchId,
        paymentStatus,
        onChangeSearch,
        onChangeOrder,
        onChangeSort,
        onChangeBranch,
        onChangePaymentStatus,
    };
}

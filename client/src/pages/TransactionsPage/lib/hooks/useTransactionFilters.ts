import { useSelector } from 'react-redux';
import { useCallback } from 'react';
import {
    getTransactionPageMonth,
    getTransactionPageOrder,
    getTransactionPageSearch,
    getTransactionPageSort,
    getTransactionPageType,
} from '../../model/selectors/transactionPageSelectors';
import { useDebounce } from '@/shared/lib/hooks/useDebounce/useDebounce';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { SortOrder } from '@/shared/types/sort';
import { TransactionType } from '@/entities/TransactionType';
import { TransactionSortField } from '@/entities/Transaction';
import { fetchTransactionsList } from '../../model/services/fetchTransactionsList/fetchTransactionsList';
import { transactionsPageActions } from '../../model/slices/transactionsPageSlice';
import { Month } from '@/entities/Month';

export function useTransactionFilters() {
    const search = useSelector(getTransactionPageSearch);
    const sort = useSelector(getTransactionPageSort);
    const order = useSelector(getTransactionPageOrder);
    const month = useSelector(getTransactionPageMonth);
    const type = useSelector(getTransactionPageType);

    const dispatch = useAppDispatch();

    const fetchData = useCallback(() => {
        dispatch(fetchTransactionsList({ replace: true }));
    }, [dispatch]);

    const debouncedFetchData = useDebounce(fetchData, 500);

    const onChangeSearch = useCallback(
        (search: string) => {
            dispatch(transactionsPageActions.setSearch(search));
            // dispatch(articlesPageActions.setPage(1));
            debouncedFetchData();
        },
        [dispatch, debouncedFetchData],
    );

    const onChangeSort = useCallback(
        (newSort: TransactionSortField) => {
            dispatch(transactionsPageActions.setSort(newSort));
            // dispatch(articlesPageActions.setPage(1));
            fetchData();
        },
        [dispatch, fetchData],
    );

    const onChangeMonth = useCallback(
        (newMonth: Month) => {
            dispatch(transactionsPageActions.setMonth(newMonth));
            // dispatch(articlesPageActions.setPage(1));
            fetchData();
        },
        [dispatch, fetchData],
    );

    const onChangeOrder = useCallback(
        (newOrder: SortOrder) => {
            dispatch(transactionsPageActions.setOrder(newOrder));
            // dispatch(articlesPageActions.setPage(1));
            fetchData();
        },
        [dispatch, fetchData],
    );

    const onChangeType = useCallback(
        (value: TransactionType) => {
            dispatch(transactionsPageActions.setType(value));
            // dispatch(articlesPageActions.setPage(1));
            fetchData();
        },
        [dispatch, fetchData],
    );

    return {
        search,
        month,
        sort,
        order,
        type,
        onChangeSearch,
        onChangeOrder,
        onChangeSort,
        onChangeType,
        onChangeMonth
    };
}

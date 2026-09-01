import { Month } from '@/entities/Month';
import { TransactionSortField } from '@/entities/Transaction';
import { TransactionType } from '@/entities/TransactionType';
import { fetchTransactionsList } from '../services/fetchTransactionsList/fetchTransactionsList';
import { fetchTransactionsSummary } from '../services/fetchTransactionsSummary/fetchTransactionsSummary';
import { transactionsPageActions, transactionsPageReducer } from './transactionsPageSlice';

describe('transactionsPageSlice', () => {
    const initialState = transactionsPageReducer(undefined, { type: 'init' });

    test('setOrder, setPage, setType, setSearch, setMonth, setSort update their fields', () => {
        let state = transactionsPageReducer(initialState, transactionsPageActions.setOrder('desc'));
        state = transactionsPageReducer(state, transactionsPageActions.setPage(3));
        state = transactionsPageReducer(state, transactionsPageActions.setType(TransactionType.EXPENSE));
        state = transactionsPageReducer(state, transactionsPageActions.setSearch('rent'));
        state = transactionsPageReducer(state, transactionsPageActions.setMonth(Month.JANUARY));
        state = transactionsPageReducer(state, transactionsPageActions.setSort(TransactionSortField.CATEGORY));

        expect(state.order).toBe('desc');
        expect(state.page).toBe(3);
        expect(state.type).toBe(TransactionType.EXPENSE);
        expect(state.search).toBe('rent');
        expect(state.month).toBe(Month.JANUARY);
        expect(state.sort).toBe(TransactionSortField.CATEGORY);
    });

    test('initState marks the slice as inited', () => {
        const state = transactionsPageReducer(initialState, transactionsPageActions.initState());

        expect(state._inited).toBe(true);
    });

    test('fetchTransactionsList.pending resets the error and sets loading', () => {
        const state = transactionsPageReducer(
            { ...initialState, error: 'error' },
            fetchTransactionsList.pending('id', {}),
        );

        expect(state.isLoading).toBe(true);
        expect(state.error).toBeUndefined();
    });

    test('fetchTransactionsList.fulfilled stores the items and computes hasMore', () => {
        const state = transactionsPageReducer(
            { ...initialState, limit: 9 },
            fetchTransactionsList.fulfilled([{ id: '1' }] as never, 'id', {}),
        );

        expect(state.isLoading).toBe(false);
        expect(state.items).toEqual([{ id: '1' }]);
        expect(state.hasMore).toBe(false);
    });

    test('fetchTransactionsList.rejected stores the error', () => {
        const state = transactionsPageReducer(
            initialState,
            fetchTransactionsList.rejected(new Error('fail'), 'id', {}, 'error'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('error');
    });

    test('fetchTransactionsSummary.pending resets the error and sets loading', () => {
        const state = transactionsPageReducer(
            { ...initialState, error: 'error' },
            fetchTransactionsSummary.pending('id', undefined),
        );

        expect(state.isLoading).toBe(true);
        expect(state.error).toBeUndefined();
    });

    test('fetchTransactionsSummary.fulfilled stores the summary', () => {
        const summary = { income: 100, expense: 50 };
        const state = transactionsPageReducer(
            initialState,
            fetchTransactionsSummary.fulfilled(summary as never, 'id', undefined),
        );

        expect(state.isLoading).toBe(false);
        expect(state.summary).toEqual(summary);
    });

    test('fetchTransactionsSummary.rejected stores the error', () => {
        const state = transactionsPageReducer(
            initialState,
            fetchTransactionsSummary.rejected(new Error('fail'), 'id', undefined, 'error'),
        );

        expect(state.isLoading).toBe(false);
        expect(state.error).toBe('error');
    });
});

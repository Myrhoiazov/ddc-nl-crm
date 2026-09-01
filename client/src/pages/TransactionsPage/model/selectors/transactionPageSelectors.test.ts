import { StateSchema } from '@/app/providers/StoreProvider';
import { Month } from '@/entities/Month';
import { TransactionSortField } from '@/entities/Transaction';
import { TransactionType } from '@/entities/TransactionType';
import {
    getTransactionPageData,
    getTransactionPageError,
    getTransactionPageInited,
    getTransactionPageIsLoading,
    getTransactionPageMonth,
    getTransactionPageOrder,
    getTransactionPageSearch,
    getTransactionPageSort,
    getTransactionPageType,
} from './transactionPageSelectors';

describe('transactionPageSelectors', () => {
    test('return the stored values', () => {
        const state = {
            transactionPage: {
                isLoading: true,
                items: [{ id: '1' }],
                _inited: true,
                search: 'rent',
                sort: TransactionSortField.CATEGORY,
                order: 'desc',
                type: TransactionType.EXPENSE,
                error: 'error',
                month: Month.JANUARY,
            },
        } as unknown as StateSchema;

        expect(getTransactionPageIsLoading(state)).toBe(true);
        expect(getTransactionPageData(state)).toEqual([{ id: '1' }]);
        expect(getTransactionPageInited(state)).toBe(true);
        expect(getTransactionPageSearch(state)).toBe('rent');
        expect(getTransactionPageSort(state)).toBe(TransactionSortField.CATEGORY);
        expect(getTransactionPageOrder(state)).toBe('desc');
        expect(getTransactionPageType(state)).toBe(TransactionType.EXPENSE);
        expect(getTransactionPageError(state)).toBe('error');
        expect(getTransactionPageMonth(state)).toBe(Month.JANUARY);
    });

    test('fall back to defaults when the slice is not mounted', () => {
        const state = {} as StateSchema;

        expect(getTransactionPageIsLoading(state)).toBe(false);
        expect(getTransactionPageData(state)).toEqual([]);
        expect(getTransactionPageSearch(state)).toBe('');
        expect(getTransactionPageSort(state)).toBe(TransactionSortField.DATE);
        expect(getTransactionPageOrder(state)).toBe('asc');
        expect(getTransactionPageType(state)).toBe(TransactionType.ALL);
        expect(getTransactionPageMonth(state)).toBe(Month.ALL);
    });
});

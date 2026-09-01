import { StateSchema } from '@/app/providers/StoreProvider';
import { getTransactionPageSummaryData } from './getTransactionPageSummary';

describe('getTransactionPageSummaryData', () => {
    test('returns the stored summary', () => {
        const summary = { income: 100, expense: 50 };
        const state = { transactionPage: { summary } } as unknown as StateSchema;

        expect(getTransactionPageSummaryData(state)).toBe(summary);
    });

    test('returns undefined when the slice is not mounted', () => {
        const state = {} as StateSchema;

        expect(getTransactionPageSummaryData(state)).toBeUndefined();
    });
});

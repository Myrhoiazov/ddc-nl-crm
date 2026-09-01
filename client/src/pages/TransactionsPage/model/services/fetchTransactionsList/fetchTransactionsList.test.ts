import { StateSchema } from '@/app/providers/StoreProvider';
import { Month } from '@/entities/Month';
import { TransactionSortField } from '@/entities/Transaction';
import { TransactionType } from '@/entities/TransactionType';
import { fetchTransactionsList } from './fetchTransactionsList';

jest.mock('../fetchTransactionsSummary/fetchTransactionsSummary', () => ({
    fetchTransactionsSummary: jest.fn(() => ({ type: 'summaryPage/fetchTransactionsSummary/mocked' })),
}));

const dispatch = jest.fn();
const extra = { apiPrivate: { get: jest.fn() } };

function stateWith(overrides: Record<string, unknown> = {}) {
    return () => ({
        transactionPage: {
            search: '',
            sort: TransactionSortField.DATE,
            order: 'asc',
            type: TransactionType.ALL,
            month: Month.ALL,
            ...overrides,
        },
    }) as unknown as StateSchema;
}

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.get.mockClear();
});

describe('fetchTransactionsList', () => {
    test('fetches transactions using the current filters and refreshes the summary', async () => {
        const transactions = [{ id: '1' }];
        extra.apiPrivate.get.mockResolvedValue({ data: transactions });

        const result = await fetchTransactionsList({})(dispatch, stateWith({ search: 'rent' }), extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/transactions', {
            params: {
                _q: 'rent',
                _sortBy: TransactionSortField.DATE,
                _order: 'asc',
                _month: Month.ALL,
                _type: null,
            },
        });
        expect(dispatch).toHaveBeenCalledWith({ type: 'summaryPage/fetchTransactionsSummary/mocked' });
        expect(result.payload).toEqual(transactions);
    });

    test('sends the type filter when it is not ALL', async () => {
        extra.apiPrivate.get.mockResolvedValue({ data: [] });

        await fetchTransactionsList({})(dispatch, stateWith({ type: TransactionType.EXPENSE }), extra as never);

        expect(extra.apiPrivate.get).toHaveBeenCalledWith('/transactions', expect.objectContaining({
            params: expect.objectContaining({ _type: TransactionType.EXPENSE }),
        }));
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.get.mockRejectedValue(new Error('network error'));

        const result = await fetchTransactionsList({})(dispatch, stateWith(), extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('error');
    });
});

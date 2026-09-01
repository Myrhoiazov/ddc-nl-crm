import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import TransactionsPage from './TransactionsPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

const transactions = [
    {
        id: '1', description: 'Аренда', amount: 100, currency: 'EUR', date: '2026-01-01', source: 'MANUAL', paymentMethod: 'CARD', type: 'EXPENSE',
    },
];
const summary = { income: 0, expense: 100 };

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/transactions') return Promise.resolve({ data: transactions });
        if (url === '/transactions/summary') return Promise.resolve({ data: summary });
        return Promise.resolve({ data: [] });
    });
});

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <TransactionsPage />
            </MemoryRouter>
        </Provider>,
    );
}

describe('TransactionsPage', () => {
    test('fetches and renders the transaction list', async () => {
        renderPage();

        expect(await screen.findByText('Аренда')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/transactions', expect.objectContaining({
            params: expect.objectContaining({ _q: '' }),
        }));
        expect($apiPrivate.get).toHaveBeenCalledWith('/transactions/summary', expect.anything());
    });

    test('renders the search filter', async () => {
        renderPage();

        expect(await screen.findByPlaceholderText('Поиск')).toBeInTheDocument();
    });
});

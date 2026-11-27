import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager, StateSchema } from '@/app/providers/StoreProvider';
import { RoleKey } from '@/entities/Role';
import { $apiPrivate } from '@/shared/api/api';
import TicketingVenuesPage from './TicketingVenuesPage';
import type { SeatMapDetail, Venue } from './ticketingVenuesApi';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

const getMock = $apiPrivate.get as jest.Mock;
const postMock = $apiPrivate.post as jest.Mock;

const venue: Venue = {
    id: 5,
    name: 'Театр',
    address: 'Hoofdstraat 1',
    city: 'Amsterdam',
    isActive: true,
    seatMaps: [{ id: 9, version: 1, status: 'DRAFT', name: 'Большой зал', publishedAt: null, _count: { seats: 2 } }],
};

const seatMap: SeatMapDetail = {
    id: 9,
    venueId: 5,
    version: 1,
    status: 'DRAFT',
    name: 'Большой зал',
    canvas: { width: 160, height: 120, seatSize: 28 },
    publishedAt: null,
    categories: [{ id: 1, code: 'C1', name: 'VIP', colorSlot: 1 }],
    seats: [
        { id: 1, categoryId: 1, rowLabel: '1', seatLabel: '1', x: 40, y: 40, isDefaultBlocked: false },
        { id: 2, categoryId: 1, rowLabel: '1', seatLabel: '2', x: 80, y: 40, isDefaultBlocked: false },
    ],
};

function renderPage() {
    const initialState = {
        user: { _inited: true, authData: { id: '1', username: 'denis', email: 'd@example.com', role: RoleKey.ADMIN } },
    } as StateSchema;
    const store = createReduxStore(initialState) as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <TicketingVenuesPage />
            </MemoryRouter>
        </Provider>,
    );
}

beforeEach(() => {
    jest.clearAllMocks();
    getMock.mockImplementation((url: string) => Promise.resolve({
        data: url.endsWith('/venues') ? { items: [venue] } : seatMap,
    }));
    postMock.mockResolvedValue({ data: { ...seatMap, status: 'PUBLISHED' } });
});

test('lists venues with their seat maps', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Театр' })).toBeInTheDocument();
    expect(screen.getByText('Amsterdam, Hoofdstraat 1')).toBeInTheDocument();
    expect(screen.getByText('Черновик')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/ticketing/admin/venues');
});

test('opens a seat map preview and publishes the draft', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Большой зал' }));
    expect(await screen.findByRole('img', { name: 'Схема зала' })).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/ticketing/admin/seat-maps/9');

    fireEvent.click(screen.getByRole('button', { name: 'Опубликовать схему' }));
    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/ticketing/admin/seat-maps/9/publish'));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Опубликовать схему' })).not.toBeInTheDocument());
});

test('creates a venue from the form', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Театр' });

    const addButton = screen.getByRole('button', { name: 'Добавить площадку' });
    expect(addButton).toBeDisabled();
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Новый зал' } });
    fireEvent.click(addButton);

    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/ticketing/admin/venues', {
        name: 'Новый зал',
        city: undefined,
        address: undefined,
    }));
});

test('shows an error state when venues cannot be loaded', async () => {
    getMock.mockRejectedValue(new Error('network'));
    renderPage();

    expect(await screen.findByText('Не удалось загрузить площадки')).toBeInTheDocument();
});

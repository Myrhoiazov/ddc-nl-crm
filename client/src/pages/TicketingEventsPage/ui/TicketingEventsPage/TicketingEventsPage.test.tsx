import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager, StateSchema } from '@/app/providers/StoreProvider';
import { RoleKey } from '@/entities/Role';
import { $apiPrivate } from '@/shared/api/api';
import TicketingEventsPage from './TicketingEventsPage';
import type { SessionDetail, TicketEvent } from './ticketingEventsApi';
import { localInputToIso, parsePriceToCents } from './ticketingFormat';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

const getMock = $apiPrivate.get as jest.Mock;
const postMock = $apiPrivate.post as jest.Mock;

const categories = [{ id: 1, code: 'C1', name: 'VIP', colorSlot: 1 }];

const event: TicketEvent = {
    id: 3,
    slug: 'gala-ab12',
    title: 'Весенний концерт',
    description: null,
    status: 'DRAFT',
    sessions: [{
        id: 7,
        startsAt: '2027-03-01T19:00:00.000Z',
        status: 'DRAFT',
        currency: 'EUR',
        seatMap: { id: 9, name: 'Большой зал', version: 1, venue: { name: 'Театр' } },
        seatCounts: {},
    }],
};

const session: SessionDetail = {
    id: 7,
    startsAt: '2027-03-01T19:00:00.000Z',
    status: 'DRAFT',
    currency: 'EUR',
    event: { id: 3, title: 'Весенний концерт' },
    prices: [{ categoryId: 1, priceCents: 4500 }],
    seats: [],
    seatMap: {
        id: 9,
        name: 'Большой зал',
        version: 1,
        canvas: { width: 160, height: 120, seatSize: 28 },
        categories,
        seats: [{ id: 1, categoryId: 1, rowLabel: '1', seatLabel: '1', x: 40, y: 40 }],
    },
};

const venues = [{ name: 'Театр', seatMaps: [{ id: 9, name: 'Большой зал', version: 1, status: 'PUBLISHED' }, { id: 10, name: 'Черновик', version: 2, status: 'DRAFT' }] }];

const respond = (url: string) => {
    if (url.endsWith('/events')) return { items: [event] };
    if (url.endsWith('/venues')) return { items: venues };
    if (url.includes('/seat-maps/')) return { categories };
    return session;
};

function renderPage() {
    const initialState = {
        user: { _inited: true, authData: { id: '1', username: 'denis', email: 'd@example.com', role: RoleKey.ADMIN } },
    } as StateSchema;
    const store = createReduxStore(initialState) as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <TicketingEventsPage />
            </MemoryRouter>
        </Provider>,
    );
}

beforeEach(() => {
    jest.clearAllMocks();
    getMock.mockImplementation((url: string) => Promise.resolve({ data: respond(url) }));
    postMock.mockResolvedValue({ data: { ...session, status: 'ON_SALE', seats: [{ seatId: 1, status: 'AVAILABLE', priceCents: 4500 }] } });
});

test('lists events with their sessions', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Весенний концерт' })).toBeInTheDocument();
    expect(screen.getByText('Театр')).toBeInTheDocument();
    expect(screen.getByText('Черновик')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/ticketing/admin/events');
});

test('opens a draft session and opens the sale', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Весенний концерт' });

    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(await screen.findByRole('img', { name: 'Схема зала' })).toBeInTheDocument();
    expect(screen.getByText(/VIP: /)).toHaveTextContent('45,00');

    fireEvent.click(screen.getByRole('button', { name: 'Открыть продажу' }));
    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/ticketing/admin/sessions/7/publish'));
    expect(await screen.findByRole('button', { name: 'Поставить на паузу' })).toBeInTheDocument();
});

test('creates a session with prices converted to cents and only published seat maps offered', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Весенний концерт' });

    fireEvent.click(screen.getByRole('button', { name: 'Новый сеанс' }));
    expect(screen.queryByRole('option', { name: /Черновик/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '9' } });
    fireEvent.change(await screen.findByLabelText('VIP, €'), { target: { value: '45,50' } });
    fireEvent.change(screen.getByLabelText('Дата и время начала'), { target: { value: '2027-03-01T19:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Создать сеанс' }));

    await waitFor(() => expect(postMock).toHaveBeenCalledWith('/ticketing/admin/events/3/sessions', {
        seatMapId: 9,
        startsAt: new Date('2027-03-01T19:00').toISOString(),
        prices: [{ categoryId: 1, priceCents: 4550 }],
    }));
});

test('parsePriceToCents accepts euro amounts and rejects anything else', () => {
    expect(parsePriceToCents('25')).toBe(2500);
    expect(parsePriceToCents(' 25,5 ')).toBe(2550);
    expect(parsePriceToCents('19.99')).toBe(1999);
    expect(parsePriceToCents('0')).toBe(0);
    expect(parsePriceToCents('')).toBeNull();
    expect(parsePriceToCents('-5')).toBeNull();
    expect(parsePriceToCents('12.345')).toBeNull();
    expect(parsePriceToCents('abc')).toBeNull();
});

test('localInputToIso rejects an empty or invalid value', () => {
    expect(localInputToIso('')).toBeNull();
    expect(localInputToIso('nonsense')).toBeNull();
    expect(localInputToIso('2027-03-01T19:00')).toBe(new Date('2027-03-01T19:00').toISOString());
});

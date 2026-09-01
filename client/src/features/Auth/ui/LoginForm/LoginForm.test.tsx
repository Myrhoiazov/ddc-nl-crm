import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $api } from '@/shared/api/api';
import LoginForm from './LoginForm';

jest.mock('@/shared/api/api', () => ({
    $api: { post: jest.fn() },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderLoginForm(onSuccess = jest.fn()) {
    const store = createReduxStore() as ReduxStoreWithManager;
    return {
        onSuccess,
        ...render(
            <Provider store={store}>
                <MemoryRouter>
                    <LoginForm onSuccess={onSuccess} />
                </MemoryRouter>
            </Provider>,
        ),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('LoginForm', () => {
    test('renders the email and password fields', () => {
        renderLoginForm();
        expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Введите пароль')).toBeInTheDocument();
    });

    test('calls onSuccess after a successful login', async () => {
        ($api.post as jest.Mock).mockResolvedValue({
            data: { id: '1', username: 'denis', email: 'd@example.com', role: 'ADMIN' },
        });
        const { onSuccess } = renderLoginForm();

        fireEvent.change(screen.getByPlaceholderText('name@company.com'), { target: { value: 'd@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Введите пароль'), { target: { value: 'secret' } });
        fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

        await screen.findByRole('button', { name: 'Войти' });
        expect(onSuccess).toHaveBeenCalled();
    });

    test('switches to the two-factor step when a challenge is required', async () => {
        ($api.post as jest.Mock).mockResolvedValue({
            data: { requiresTwoFactor: true, maskedEmail: 'd***@example.com' },
        });
        renderLoginForm();

        fireEvent.change(screen.getByPlaceholderText('name@company.com'), { target: { value: 'd@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Введите пароль'), { target: { value: 'secret' } });
        fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

        expect(await screen.findByText('Введите код подтверждения')).toBeInTheDocument();
    });

    test('shows an invalid-credentials message on a 401 response', async () => {
        const error = new Error('Unauthorized') as Error & { isAxiosError: boolean; response: { status: number } };
        error.isAxiosError = true;
        error.response = { status: 401 };
        ($api.post as jest.Mock).mockRejectedValue(error);
        renderLoginForm();

        fireEvent.change(screen.getByPlaceholderText('name@company.com'), { target: { value: 'd@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Введите пароль'), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

        expect(await screen.findByText('Вы ввели неверный логин или пароль')).toBeInTheDocument();
    });
});

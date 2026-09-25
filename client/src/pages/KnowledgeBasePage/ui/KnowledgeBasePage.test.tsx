import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import KnowledgeBasePage from './KnowledgeBasePage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

const pendingDocument = {
    id: 'manual:abc', title: 'Прайс на занятия', sourceType: 'file', sourceUrl: 'file://price.md',
    status: 'PENDING', category: 'CLASSES', priority: 5, tags: ['цены'], chunkCount: 0,
    errorMessage: null, lastSyncedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-01',
};

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/knowledge/documents') {
            return Promise.resolve({ data: { items: [pendingDocument], total: 1, page: 1, limit: 20, totalPages: 1, pendingTotal: 1 } });
        }
        if (url === '/ai-email/prompts') return Promise.resolve({ data: [] });
        return Promise.resolve({ data: {} });
    });
});

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <KnowledgeBasePage />
            </MemoryRouter>
        </Provider>,
    );
}

describe('KnowledgeBasePage', () => {
    test('renders loaded documents with their status', async () => {
        renderPage();
        expect(await screen.findByText('Прайс на занятия')).toBeInTheDocument();
        expect(screen.getByText('Ожидает эмбеддинга')).toBeInTheDocument();
    });

    test('crawls a URL with the selected category and tags', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { id: 'manual:new', status: 'PENDING' } });
        renderPage();
        await screen.findByText('Прайс на занятия');

        fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'https://example.com/page' } });
        fireEvent.click(screen.getByText('Собрать по ссылке'));

        await waitFor(() => {
            expect($apiPrivate.post).toHaveBeenCalledWith('/knowledge/documents/crawl', expect.objectContaining({
                url: 'https://example.com/page', category: 'OTHER', priority: 0, tags: '',
            }));
        });
        expect(toast.success).toHaveBeenCalledWith('Страница собрана, ожидает эмбеддинга');
    });

    test('does not crawl without a URL', async () => {
        renderPage();
        await screen.findByText('Прайс на занятия');

        fireEvent.click(screen.getByText('Собрать по ссылке'));

        expect($apiPrivate.post).not.toHaveBeenCalled();
    });

    test('runs embedding for a pending document', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { status: 'ACTIVE', chunks: 3 } });
        renderPage();
        await screen.findByText('Прайс на занятия');

        fireEvent.click(screen.getByText('Запустить эмбеддинг'));

        await waitFor(() => expect($apiPrivate.post).toHaveBeenCalledWith('/knowledge/documents/manual%3Aabc/embed'));
        expect(toast.success).toHaveBeenCalledWith('Эмбеддинг запущен');
    });

    test('deletes a document after confirmation', async () => {
        ($apiPrivate.delete as jest.Mock).mockResolvedValue({});
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        renderPage();
        await screen.findByText('Прайс на занятия');

        fireEvent.click(screen.getByText('Удалить'));

        await waitFor(() => expect($apiPrivate.delete).toHaveBeenCalledWith('/knowledge/documents/manual%3Aabc'));
    });

    test('paginates documents 20 per page and requests the next page on click', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string, config?: { params?: { _page?: number } }) => {
            if (url === '/ai-email/prompts') return Promise.resolve({ data: [] });
            if (url !== '/knowledge/documents') return Promise.resolve({ data: {} });
            const page = config?.params?._page ?? 1;
            const items = page === 1 ? [pendingDocument] : [{ ...pendingDocument, id: 'manual:def', title: 'Второй документ' }];
            return Promise.resolve({ data: { items, total: 21, page, limit: 20, totalPages: 2, pendingTotal: 1 } });
        });
        renderPage();
        expect(await screen.findByText('Прайс на занятия')).toBeInTheDocument();
        expect(screen.getByText('1–20 из 21')).toBeInTheDocument();
        expect(screen.getByText('1 / 2')).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('Следующая страница'));

        await waitFor(() => {
            expect($apiPrivate.get).toHaveBeenCalledWith('/knowledge/documents', { params: { _page: 2, _limit: 20 } });
        });
        expect(await screen.findByText('Второй документ')).toBeInTheDocument();
        expect(screen.getByText('21–21 из 21')).toBeInTheDocument();
        expect(screen.getByLabelText('Следующая страница')).toBeDisabled();
    });

    test('runs an email simulation and renders the classification, retrieved knowledge, and draft', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({
            data: {
                normalized: { fromAddress: 'test@example.com', subject: 'Вопрос про цены', normalizedBody: 'Сколько стоит абонемент?' },
                deterministicSpamReason: null,
                classification: { spam: false, needsReply: true, language: 'ru', intent: 'pricing', confidence: 0.9, reason: '' },
                knowledge: [{ id: 'k1', sourceUrl: 'https://ddc.example/pricing', content: 'Абонемент стоит 100 евро в месяц', score: 0.82 }],
                crmContact: null,
                draft: { replyLanguage: 'ru', subject: 'Re: Вопрос про цены', body: 'Здравствуйте! Абонемент стоит 100 евро в месяц.', confidence: 0.85, needsManualAnswer: false, usedKnowledgeIds: ['k1'] },
                draftSkippedReason: null,
                runId: null, metrics: [],
            },
        });
        renderPage();
        await screen.findByText('Прайс на занятия');

        fireEvent.change(screen.getByLabelText('Тема письма *'), { target: { value: 'Вопрос про цены' } });
        fireEvent.change(screen.getByLabelText('Текст письма *'), { target: { value: 'Сколько стоит абонемент?' } });
        fireEvent.click(screen.getByText('Запустить симуляцию'));

        await waitFor(() => {
            expect($apiPrivate.post).toHaveBeenCalledWith('/ai-email/simulate', expect.objectContaining({
                subject: 'Вопрос про цены', body: 'Сколько стоит абонемент?', noKnowledge: false, forceDraft: false,
            }));
        });
        expect(await screen.findByText('Здравствуйте! Абонемент стоит 100 евро в месяц.')).toBeInTheDocument();
        expect(screen.getByText('Абонемент стоит 100 евро в месяц')).toBeInTheDocument();
    });

    test('renders per-stage metrics (model, duration, tokens) after a simulation run', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({
            data: {
                normalized: { fromAddress: 'test@example.com', subject: 'Вопрос про цены', normalizedBody: 'Сколько стоит абонемент?' },
                deterministicSpamReason: null,
                classification: { spam: false, needsReply: true, language: 'ru', intent: 'pricing', confidence: 0.9, reason: '' },
                knowledge: [],
                crmContact: null,
                draft: { replyLanguage: 'ru', subject: 'Re: Вопрос про цены', body: 'Здравствуйте!', confidence: 0.85, needsManualAnswer: false, usedKnowledgeIds: [] },
                draftSkippedReason: null,
                runId: 7,
                metrics: [
                    { stage: 'CLASSIFICATION', provider: 'OLLAMA', model: 'qwen3:0.6b', callCount: 1, durationMs: 214, promptTokens: 120, completionTokens: 30, totalTokens: 150 },
                    { stage: 'DRAFT', provider: 'OPENAI', model: 'gpt-4o-mini', callCount: 1, durationMs: 980, promptTokens: 512, completionTokens: 96, totalTokens: 608 },
                ],
            },
        });
        renderPage();
        await screen.findByText('Прайс на занятия');

        fireEvent.change(screen.getByLabelText('Тема письма *'), { target: { value: 'Вопрос про цены' } });
        fireEvent.change(screen.getByLabelText('Текст письма *'), { target: { value: 'Сколько стоит абонемент?' } });
        fireEvent.click(screen.getByText('Запустить симуляцию'));

        expect(await screen.findByText(/qwen3:0.6b/)).toBeInTheDocument();
        expect(screen.getByText(/120→30 токенов/)).toBeInTheDocument();
        expect(screen.getByText(/gpt-4o-mini/)).toBeInTheDocument();
        expect(screen.getByText(/512→96 токенов/)).toBeInTheDocument();
    });

    test('displays the query expansion result and can disable expansion/rerank per run', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({
            data: {
                normalized: { fromAddress: 'test@example.com', subject: 'Вопрос про цены', normalizedBody: 'Сколько стоит абонемент?' },
                deterministicSpamReason: null,
                classification: { spam: false, needsReply: true, language: 'ru', intent: 'pricing', confidence: 0.9, reason: '' },
                knowledge: [{ id: 'k1', sourceUrl: 'https://ddc.example/pricing', content: 'Абонемент стоит 100 евро в месяц', score: 0.82 }],
                queryExpansion: { cleanQuery: 'цена абонемента', keywords: ['цена', 'абонемент'] },
                crmContact: null,
                draft: null,
                draftSkippedReason: 'classification_gate',
                runId: null, metrics: [],
            },
        });
        renderPage();
        await screen.findByText('Прайс на занятия');

        fireEvent.change(screen.getByLabelText('Тема письма *'), { target: { value: 'Вопрос про цены' } });
        fireEvent.change(screen.getByLabelText('Текст письма *'), { target: { value: 'Сколько стоит абонемент?' } });
        fireEvent.click(screen.getByLabelText('Без расширения запроса'));
        fireEvent.click(screen.getByLabelText('Без реранкинга'));
        fireEvent.click(screen.getByText('Запустить симуляцию'));

        await waitFor(() => {
            expect($apiPrivate.post).toHaveBeenCalledWith('/ai-email/simulate', expect.objectContaining({
                noQueryExpansion: true, noRerank: true,
            }));
        });
        expect(await screen.findByText(/цена абонемента/)).toBeInTheDocument();
        expect(screen.getByText(/цена, абонемент/)).toBeInTheDocument();
    });

    test('does not run a simulation without subject and body', async () => {
        renderPage();
        await screen.findByText('Прайс на занятия');

        fireEvent.click(screen.getByText('Запустить симуляцию'));

        expect($apiPrivate.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('Укажите тему и текст письма');
    });

    test('shows the deterministic spam reason instead of running classification/draft', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({
            data: {
                normalized: { fromAddress: 'test@example.com', subject: 'Выиграйте деньги', normalizedBody: 'you won the lottery' },
                deterministicSpamReason: 'obvious_spam_keyword',
                classification: null,
                knowledge: [],
                crmContact: null,
                draft: null,
                draftSkippedReason: 'deterministic_spam',
                runId: null, metrics: [],
            },
        });
        renderPage();
        await screen.findByText('Прайс на занятия');

        fireEvent.change(screen.getByLabelText('Тема письма *'), { target: { value: 'Выиграйте деньги' } });
        fireEvent.change(screen.getByLabelText('Текст письма *'), { target: { value: 'you won the lottery' } });
        fireEvent.click(screen.getByText('Запустить симуляцию'));

        expect(await screen.findByText(/obvious_spam_keyword/)).toBeInTheDocument();
    });

    const draftPrompt = {
        id: 1, slot: 'DRAFT_BODY', name: 'v2 — короче', content: 'Отвечай короче.', tags: ['эксперимент'],
        isActive: false, createdAt: '2026-01-01', updatedAt: '2026-01-01',
    };
    const classificationPrompt = {
        id: 2, slot: 'CLASSIFICATION', name: 'base', content: 'Classify.', tags: [],
        isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01',
    };

    test('lists saved prompts grouped by slot with an active badge', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/ai-email/prompts') return Promise.resolve({ data: [draftPrompt, classificationPrompt] });
            if (url === '/knowledge/documents') {
                return Promise.resolve({ data: { items: [pendingDocument], total: 1, page: 1, limit: 20, totalPages: 1, pendingTotal: 1 } });
            }
            return Promise.resolve({ data: {} });
        });
        renderPage();

        expect((await screen.findAllByText('v2 — короче')).length).toBeGreaterThan(0);
        expect(screen.getByText('base')).toBeInTheDocument();
        expect(screen.getByText('Активен')).toBeInTheDocument();
        expect(screen.getByText('Неактивен')).toBeInTheDocument();
    });

    test('creates a new prompt', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/ai-email/prompts') return Promise.resolve({ data: [] });
            if (url === '/knowledge/documents') {
                return Promise.resolve({ data: { items: [pendingDocument], total: 1, page: 1, limit: 20, totalPages: 1, pendingTotal: 1 } });
            }
            return Promise.resolve({ data: {} });
        });
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: draftPrompt });
        renderPage();
        await screen.findByText('Прайс на занятия');

        fireEvent.change(screen.getByPlaceholderText('v2 — короче'), { target: { value: 'v2 — короче' } });
        fireEvent.change(screen.getByLabelText('Текст промпта'), { target: { value: 'Отвечай короче.' } });
        fireEvent.click(screen.getByText('Создать'));

        await waitFor(() => {
            expect($apiPrivate.post).toHaveBeenCalledWith('/ai-email/prompts', expect.objectContaining({
                slot: 'DRAFT_BODY', name: 'v2 — короче', content: 'Отвечай короче.',
            }));
        });
        expect(toast.success).toHaveBeenCalledWith('Промпт создан');
    });

    test('activates a prompt', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/ai-email/prompts') return Promise.resolve({ data: [draftPrompt] });
            if (url === '/knowledge/documents') {
                return Promise.resolve({ data: { items: [pendingDocument], total: 1, page: 1, limit: 20, totalPages: 1, pendingTotal: 1 } });
            }
            return Promise.resolve({ data: {} });
        });
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { ...draftPrompt, isActive: true } });
        renderPage();
        await screen.findByText('Активировать');

        fireEvent.click(screen.getByText('Активировать'));

        await waitFor(() => expect($apiPrivate.post).toHaveBeenCalledWith('/ai-email/prompts/1/activate'));
        expect(toast.success).toHaveBeenCalledWith('Промпт активирован — теперь используется и в реальных письмах');
    });

    test('sends the selected prompt id when running a simulation with a specific draft prompt', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/ai-email/prompts') return Promise.resolve({ data: [draftPrompt] });
            if (url === '/knowledge/documents') {
                return Promise.resolve({ data: { items: [pendingDocument], total: 1, page: 1, limit: 20, totalPages: 1, pendingTotal: 1 } });
            }
            return Promise.resolve({ data: {} });
        });
        ($apiPrivate.post as jest.Mock).mockResolvedValue({
            data: {
                normalized: { fromAddress: 'test@example.com', subject: 's', normalizedBody: 'b' },
                deterministicSpamReason: null,
                classification: { spam: false, needsReply: true, language: 'ru', intent: 'other', confidence: 0.5, reason: '' },
                knowledge: [], crmContact: null, draft: null, draftSkippedReason: 'classification_gate',
                runId: null, metrics: [],
            },
        });
        renderPage();
        await screen.findByText('Активировать');

        fireEvent.change(screen.getByLabelText('Тема письма *'), { target: { value: 's' } });
        fireEvent.change(screen.getByLabelText('Текст письма *'), { target: { value: 'b' } });
        fireEvent.change(screen.getByLabelText('Промпт черновика'), { target: { value: '1' } });
        fireEvent.click(screen.getByText('Запустить симуляцию'));

        await waitFor(() => {
            expect($apiPrivate.post).toHaveBeenCalledWith('/ai-email/simulate', expect.objectContaining({ draftBodyPromptId: 1 }));
        });
    });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { $apiPrivate } from '@/shared/api/api';
import { Mandate } from '@/entities/Mandate';
import { CustomerMandatesSection } from './CustomerMandatesSection';

jest.mock('@/shared/api/api', () => ({
    $apiPrivate: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

const mandates: Mandate[] = [
    { id: 'mdt_1', status: 'valid', method: 'directdebit' as Mandate['method'] },
    { id: 'mdt_2', status: 'invalid', method: 'directdebit' as Mandate['method'] },
];

const storedDocument = {
    id: 7,
    mandateId: 'mdt_1',
    originalName: 'mandaat-moeder.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    caption: 'Paper mandate from the mother',
    createdAt: '2026-10-01T10:00:00.000Z',
};

const renderSection = () => render(
    <CustomerMandatesSection
        customerId="12" version={0} mandates={mandates} isLoading={false} onRevokeMandate={jest.fn()}
    />,
);

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: [storedDocument] });
});

test('shows each uploaded document with its caption under the mandate it belongs to', async () => {
    renderSection();

    expect(await screen.findByText('mandaat-moeder.pdf')).toBeInTheDocument();
    expect(screen.getByText('Paper mandate from the mother')).toBeInTheDocument();
    expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/customers/12/mandate-documents');
    expect(screen.getAllByText('Файл ещё не загружен')).toHaveLength(1);
});

test('uploads a signed mandate with an optional caption to the chosen mandate', async () => {
    const created = { ...storedDocument, id: 8, mandateId: 'mdt_2', originalName: 'scan.png', caption: 'Father' };
    ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: created });
    renderSection();
    await screen.findByText('mandaat-moeder.pdf');

    const file = new File(['png'], 'scan.png', { type: 'image/png' });
    fireEvent.change(screen.getAllByLabelText('Файл подписанного мандата')[1], { target: { files: [file] } });
    fireEvent.change(screen.getAllByPlaceholderText('Подпись (необязательно)')[1], { target: { value: ' Father ' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Загрузить' })[1]);

    expect(await screen.findByText('scan.png')).toBeInTheDocument();
    const [url, payload] = ($apiPrivate.post as jest.Mock).mock.calls[0];
    expect(url).toBe('/mollie/customers/12/mandates/mdt_2/documents');
    expect((payload as FormData).get('file')).toBe(file);
    expect((payload as FormData).get('caption')).toBe('Father');
});

test('does not send a caption when it is left empty', async () => {
    ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { ...storedDocument, id: 9, caption: null } });
    renderSection();
    await screen.findByText('mandaat-moeder.pdf');

    const file = new File(['%PDF'], 'second.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getAllByLabelText('Файл подписанного мандата')[0], { target: { files: [file] } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Загрузить' })[0]);

    await waitFor(() => expect($apiPrivate.post).toHaveBeenCalled());
    expect((($apiPrivate.post as jest.Mock).mock.calls[0][1] as FormData).has('caption')).toBe(false);
});

test('keeps the upload button disabled until a file is chosen', async () => {
    renderSection();
    await screen.findByText('mandaat-moeder.pdf');

    screen.getAllByRole('button', { name: 'Загрузить' }).forEach((button) => expect(button).toBeDisabled());
});

test('deletes a document after confirmation', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    ($apiPrivate.delete as jest.Mock).mockResolvedValue({});
    renderSection();
    await screen.findByText('mandaat-moeder.pdf');

    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

    await waitFor(() => expect(screen.queryByText('mandaat-moeder.pdf')).not.toBeInTheDocument());
    expect($apiPrivate.delete).toHaveBeenCalledWith('/mollie/mandate-documents/7');
});

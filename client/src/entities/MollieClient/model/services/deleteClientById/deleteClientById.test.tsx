import { deleteClientById } from './deleteClientById';

const dispatch = jest.fn();
const extra = { apiPrivate: { delete: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.delete.mockClear();
});

describe('MollieClient deleteClientById', () => {
    test('deletes the client and fulfills with the response payload', async () => {
        const client = { id: '1', name: 'Client B.V.' };
        extra.apiPrivate.delete.mockResolvedValue({ data: client });

        const result = await deleteClientById()(dispatch, () => ({}) as never, extra as never);

        expect(extra.apiPrivate.delete).toHaveBeenCalledWith('/clients/undefined');
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(client);
    });

    test('rejects when the API call fails', async () => {
        extra.apiPrivate.delete.mockRejectedValue(new Error('network error'));

        const result = await deleteClientById()(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toBe('some error');
    });
});

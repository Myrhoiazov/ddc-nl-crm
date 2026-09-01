import { deleteClientById } from './deleteClientById';

const dispatch = jest.fn();
const extra = { apiPrivate: { delete: jest.fn() } };

beforeEach(() => {
    dispatch.mockClear();
    extra.apiPrivate.delete.mockClear();
});

describe('deleteClientById', () => {
    test('deletes the client and fulfills with the response payload', async () => {
        const client = { id: '1', firstName: 'Иван' };
        extra.apiPrivate.delete.mockResolvedValue({ data: client });

        const result = await deleteClientById()(dispatch, () => ({}) as never, extra as never);

        expect(extra.apiPrivate.delete).toHaveBeenCalledWith('/clients/undefined');
        expect(result.meta.requestStatus).toBe('fulfilled');
        expect(result.payload).toEqual(client);
    });

    test('rejects with a server error shape when the API call fails', async () => {
        extra.apiPrivate.delete.mockRejectedValue(new Error('network error'));

        const result = await deleteClientById()(dispatch, () => ({}) as never, extra as never);

        expect(result.meta.requestStatus).toBe('rejected');
        expect(result.payload).toEqual({ status: 500, message: 'Unknown error' });
    });
});

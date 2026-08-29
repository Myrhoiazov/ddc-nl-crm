import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { Client, ServerError } from '../../types/client';

export const deleteClientById = createAsyncThunk<Client, void, ThunkConfig<ServerError>>(
    'clients/fetchClientById',
    async (clientId, thunkAPI) => {
        const { extra, rejectWithValue } = thunkAPI;
        try {
            const response = await extra.apiPrivate.delete<Client>(`/clients/${clientId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue({ status: 500, message: 'Unknown error' });
        }
    }
);

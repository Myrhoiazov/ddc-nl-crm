import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { Client } from '@/entities/Client';

export const deleteClientById = createAsyncThunk<Client, string, ThunkConfig<string>>(
    'clients/fetchClientById',
    async (clientId, thunkAPI) => {
        const { extra, rejectWithValue } = thunkAPI;
        try {
            const response = await extra.apiPrivate.delete<Client>(`/clients/${clientId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue('delete');
        }
    }
);

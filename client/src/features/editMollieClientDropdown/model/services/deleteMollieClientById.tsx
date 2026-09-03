import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { MollieClient } from '@/entities/MollieClient';

export const deleteMollieClientById = createAsyncThunk<MollieClient, string, ThunkConfig<string>>(
    'mollieClients/fetchClientById',
    async (clientId, thunkAPI) => {
        const { extra, rejectWithValue } = thunkAPI;
        try {
            const response = await extra.apiPrivate.delete<MollieClient>(`/mollie/customers${clientId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue('delete');
        }
    }
);

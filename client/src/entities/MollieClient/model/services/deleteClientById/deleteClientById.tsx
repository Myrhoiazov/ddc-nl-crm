import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfig } from '@/app/providers/StoreProvider';
import { MollieClient } from '../../types/mollieClient';

export const deleteClientById = createAsyncThunk<MollieClient, void, ThunkConfig<string>>(
    'clients/fetchClientById',
    async (clientId, thunkAPI) => {
        const { extra, rejectWithValue } = thunkAPI;
        try {
            const response = await extra.apiPrivate.delete<MollieClient>(`/clients/${clientId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue('some error');
        }
    }
);

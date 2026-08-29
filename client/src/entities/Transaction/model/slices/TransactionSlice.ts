import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TransactionSchema } from '../types/TransactionSchema';

const initialState: TransactionSchema = {
    items: undefined,
    isLoading: false,
    error: undefined

};

export const TransactionSlice = createSlice({
    name: 'Transaction',
    initialState,
    reducers: {
        template: (state, action: PayloadAction<string>) => {

        },
    },
    // extraReducers: (builder) => {
    //     builder
    //         .addCase(, (state) => {
    //             state.error = undefined;
    //             state.isLoading = true;
    //         })
    //         .addCase(, (state) => {
    //             state.isLoading = false;
    //         })
    //         .addCase(, (state, action) => {
    //             state.isLoading = false;
    //             state.error = action.payload;
    //         });
    // },
});

export const { actions: TransactionActions } = TransactionSlice;
export const { reducer: TransactionReducer } = TransactionSlice;
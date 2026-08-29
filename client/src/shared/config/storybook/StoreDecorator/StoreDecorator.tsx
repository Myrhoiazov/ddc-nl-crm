import { Decorator } from '@storybook/react';
import { StateSchema, StoreProvider } from '@/app/providers/StoreProvider';
import { loginReducer } from '@/features/Auth/model/slice/authSlice';
import { profileReducer } from '@/entities/Profile';
import { ReducersList } from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';

const defaultAsyncReducers: ReducersList = {
    loginForm: loginReducer,
    profile: profileReducer,
};

export const StoreDecorator =
    (state: DeepPartial<StateSchema>, asyncReducers?: ReducersList): Decorator =>
        (Story, context) => (
            <StoreProvider
                initialState={state}
                asyncReducers={{ ...defaultAsyncReducers, ...asyncReducers }}
            >
                <Story {...context} />
            </StoreProvider>
        );

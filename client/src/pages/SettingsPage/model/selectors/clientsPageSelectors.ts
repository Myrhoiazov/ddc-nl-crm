import { StateSchema } from '@/app/providers/StoreProvider';
import { ClientSortField, ClientView } from '@/entities/Client';
import { ClientStatusKey } from '@/entities/ClientStatus';

export const getSettingsPageIsLoading = (state: StateSchema) => state.settingsPage?.isLoading || false;
export const getSettingsPageError = (state: StateSchema) => state.settingsPage?.error;
export const getSettingsPageUsers = (state: StateSchema) => state.settingsPage?.users || [];

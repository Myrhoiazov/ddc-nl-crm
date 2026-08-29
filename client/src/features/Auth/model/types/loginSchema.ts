export interface LoginSchema {
    email: string;
    password: string;
    isLoading: boolean;
    error?: ServerError;
}

interface ServerError {
    status: number;
    message?: string;
}
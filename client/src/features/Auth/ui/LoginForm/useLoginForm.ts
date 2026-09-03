import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { FormEvent } from 'react';
import { getLoginEmail } from '../../model/selectors/getLoginEmail/getLoginEmail';
import { getLoginPassword } from '../../model/selectors/getLoginPassword/getLoginPassword';
import { getLoginIsLoading } from '../../model/selectors/getLoginIsLoading/getLoginIsLoading';
import { getLoginError } from '../../model/selectors/getLoginError/getLoginError';
import { loginByUsername } from '../../model/services/loginByUsername/loginByUsername';
import { loginActions } from '../../model/slice/authSlice';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';

interface UseLoginFormParams {
    onSuccess?: () => void;
}

export const useLoginForm = ({ onSuccess }: UseLoginFormParams) => {
    const email = useSelector(getLoginEmail);
    const password = useSelector(getLoginPassword);
    const dispatch = useAppDispatch();
    const isLoading = useSelector(getLoginIsLoading);
    const error = useSelector(getLoginError);
    const [pendingMaskedEmail, setPendingMaskedEmail] = useState<string>();

    const onChangeEmail = useCallback((value: string) => {
        dispatch(loginActions.cleanError());
        dispatch(loginActions.setUseremail(value));
    }, [dispatch]);

    const onChangePassword = useCallback((value: string) => {
        dispatch(loginActions.cleanError());
        dispatch(loginActions.setPassword(value));
    }, [dispatch]);

    const onLoginClick = useCallback(async () => {
        const result = await dispatch(loginByUsername({ email, password }));
        if (result.meta.requestStatus !== 'fulfilled') return;
        const payload = result.payload;
        if (payload && 'requiresTwoFactor' in payload) {
            setPendingMaskedEmail(payload.maskedEmail);
        } else {
            onSuccess?.();
        }
    }, [onSuccess, dispatch, password, email]);

    const onSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void onLoginClick();
    }, [onLoginClick]);

    const onBackToCredentials = useCallback(() => {
        setPendingMaskedEmail(undefined);
    }, []);

    return {
        email,
        password,
        isLoading,
        error,
        pendingMaskedEmail,
        onChangeEmail,
        onChangePassword,
        onSubmit,
        onBackToCredentials,
    };
};

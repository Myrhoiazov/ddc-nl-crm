import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { useSelector } from 'react-redux';
import { memo, useCallback, useState } from 'react';
import { Text } from '@/shared/ui/Text/Text';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { getLoginEmail } from '../../model/selectors/getLoginEmail/getLoginEmail';
import { getLoginPassword } from '../../model/selectors/getLoginPassword/getLoginPassword';
import { getLoginIsLoading } from '../../model/selectors/getLoginIsLoading/getLoginIsLoading';
import { getLoginError } from '../../model/selectors/getLoginError/getLoginError';
import { loginByUsername } from '../../model/services/loginByUsername/loginByUsername';
import { loginActions, loginReducer } from '../../model/slice/authSlice';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Input } from '@/shared/ui/Input/Input';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import cls from './LoginForm.module.scss';
import { VStack } from '@/shared/ui/Stack';
import { AppImage } from '@/shared/ui/AppImage';
import Logo from '@/shared/assets/logo/ddc_logo.png';
import Logo_White from '@/shared/assets/logo/ddc_logo_white.png';
import { Card } from '@/shared/ui/Card/Card';
import { Theme } from '@/shared/const/theme';
import { useTheme } from '@/shared/lib/hooks/useTheme/useTheme';
import { FormEvent } from 'react';
import { TwoFactorForm } from '../TwoFactorForm/TwoFactorForm';

export interface LoginFormProps {
    className?: string;
    onSuccess?: () => void;
}

const initialReducers: ReducersList = {
    loginForm: loginReducer,
};

const LoginForm = memo(({ className, onSuccess }: LoginFormProps) => {
    const { t } = useTranslation();
    const { theme } = useTheme();

    const email = useSelector(getLoginEmail);
    const password = useSelector(getLoginPassword);
    const dispatch = useAppDispatch();
    const isLoading = useSelector(getLoginIsLoading);
    const error = useSelector(getLoginError);

    // Set once /login responds with requiresTwoFactor — switches the form to the
    // code-entry step. Cleared by "Назад" to go back to the credentials step.
    const [pendingMaskedEmail, setPendingMaskedEmail] = useState<string>();

    const onChangeEmail = useCallback(
        (value: string) => {
            dispatch(loginActions.cleanError());
            dispatch(loginActions.setUseremail(value));
        },
        [dispatch]
    );

    const onChangePassword = useCallback(
        (value: string) => {
            dispatch(loginActions.cleanError());
            dispatch(loginActions.setPassword(value));
        },
        [dispatch]
    );

    const onLoginClick = useCallback(async () => {
        const result = await dispatch(loginByUsername({ email, password }));
        if (result.meta.requestStatus === 'fulfilled') {
            const payload = result.payload;
            if (payload && 'requiresTwoFactor' in payload) {
                setPendingMaskedEmail(payload.maskedEmail);
            } else {
                onSuccess?.();
            }
        }
    }, [onSuccess, dispatch, password, email]);

    const onSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void onLoginClick();
        },
        [onLoginClick]
    );

    const onBackToCredentials = useCallback(() => {
        setPendingMaskedEmail(undefined);
    }, []);

    if (pendingMaskedEmail) {
        return (
            <TwoFactorForm
                className={className}
                maskedEmail={pendingMaskedEmail}
                onSuccess={onSuccess}
                onBack={onBackToCredentials}
            />
        );
    }

    return (
        <DynamicModuleLoader reducers={initialReducers}>
            <Card
                className={classNames(cls.LoginForm, {}, [className])}
                padding="40"
            >
                <form onSubmit={onSubmit}>
                    <VStack align="center">
                        <div className={cls.logoWrap}>
                            <AppImage
                                src={theme === Theme.DARK ? Logo_White : Logo}
                                alt="DDC Talent Center"
                                width={112}
                            />
                        </div>
                        <VStack gap="4" align="center" className={cls.header}>
                            <Text size="m" title={t('Добро пожаловать')} bold />
                            <Text size="s" text={t('Войдите в рабочее пространство DDC CRM')} />
                        </VStack>
                    </VStack>

                    <div className={cls.fields}>
                        <Input
                            fullWidth
                            label={t('Электронная почта')}
                            autofocus
                            type="email"
                            className={cls.input}
                            placeholder={t('name@company.com')}
                            onChange={onChangeEmail}
                            value={email}
                            autoComplete="email"
                        />

                        <Input
                            fullWidth
                            label={t('Пароль')}
                            type="password"
                            className={cls.input}
                            placeholder={t('Введите пароль')}
                            onChange={onChangePassword}
                            value={password}
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <div className={cls.error}>
                            {error.status === 401
                                ? t('Вы ввели неверный логин или пароль')
                                : error.message || t('Не удалось выполнить вход')}
                        </div>
                    )}

                    <VStack gap="16" align="center">
                        <Button
                            type="submit"
                            theme={ButtonTheme.BACKGROUND_INVERTED}
                            className={cls.loginBtn}
                            disabled={isLoading}
                            fullWidth
                        >
                            {isLoading ? t('Выполняется вход...') : t('Войти')}
                        </Button>
                        <Button theme={ButtonTheme.CLEAR} className={cls.forgot}>
                            {t('Забыли пароль?')}
                        </Button>
                    </VStack>
                </form>
            </Card>
        </DynamicModuleLoader>
    );
});

export default LoginForm;

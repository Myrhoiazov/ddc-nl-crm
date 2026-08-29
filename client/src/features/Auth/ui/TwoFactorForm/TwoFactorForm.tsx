import { FormEvent, memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { Input } from '@/shared/ui/Input/Input';
import { CheckBox } from '@/shared/ui/CheckBox';
import { Text } from '@/shared/ui/Text/Text';
import { Card } from '@/shared/ui/Card/Card';
import { VStack } from '@/shared/ui/Stack';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { verifyTwoFactorCode } from '../../model/services/verifyTwoFactorCode/verifyTwoFactorCode';
import { resendTwoFactorCode } from '../../model/services/resendTwoFactorCode/resendTwoFactorCode';
import cls from './TwoFactorForm.module.scss';

const RESEND_COOLDOWN_SECONDS = 60;

export interface TwoFactorFormProps {
    className?: string;
    maskedEmail: string;
    onSuccess?: () => void;
    onBack: () => void;
}

export const TwoFactorForm = memo(({ className, maskedEmail, onSuccess, onBack }: TwoFactorFormProps) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const [code, setCode] = useState('');
    const [trustDevice, setTrustDevice] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string>();

    const [isResending, setIsResending] = useState(false);
    const [resendMessage, setResendMessage] = useState<string>();
    // The server's own cooldown already starts counting from the moment the
    // first code was sent (during /login), so the resend button starts disabled.
    const [resendAvailableAt, setResendAvailableAt] = useState(() => Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

    useEffect(() => {
        const interval = setInterval(() => {
            setSecondsLeft(Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000)));
        }, 250);
        return () => clearInterval(interval);
    }, [resendAvailableAt]);

    const onChangeCode = useCallback((value: string) => {
        setError(undefined);
        setCode(value.replace(/\D/g, '').slice(0, 6));
    }, []);

    const onSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (code.length !== 6) {
            setError(t('Введите 6-значный код'));
            return;
        }

        setError(undefined);
        setIsVerifying(true);
        const result = await dispatch(verifyTwoFactorCode({ code, trustDevice }));
        setIsVerifying(false);

        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess?.();
        } else {
            const payload = result.payload as { message?: string } | undefined;
            setError(payload?.message || t('Не удалось подтвердить код'));
        }
    }, [code, trustDevice, dispatch, onSuccess, t]);

    const onResend = useCallback(async () => {
        setError(undefined);
        setResendMessage(undefined);
        setIsResending(true);
        const result = await dispatch(resendTwoFactorCode());
        setIsResending(false);

        if (result.meta.requestStatus === 'fulfilled') {
            setResendAvailableAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
            setResendMessage(t('Код отправлен повторно'));
        } else {
            const payload = result.payload as { message?: string; retryAfterSeconds?: number } | undefined;
            if (payload?.retryAfterSeconds) {
                setResendAvailableAt(Date.now() + payload.retryAfterSeconds * 1000);
            }
            setError(payload?.message || t('Не удалось отправить код повторно'));
        }
    }, [dispatch, t]);

    return (
        <Card className={classNames(cls.TwoFactorForm, {}, [className])} padding="40">
            <form onSubmit={onSubmit}>
                <VStack gap="4" align="center" className={cls.header}>
                    <Text size="m" title={t('Введите код подтверждения')} bold />
                    <Text size="s" text={t('Мы отправили код на {{email}}', { email: maskedEmail })} />
                </VStack>

                <div className={cls.fields}>
                    <Input
                        fullWidth
                        label={t('Код из письма')}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        autofocus
                        className={cls.input}
                        placeholder="000000"
                        value={code}
                        onChange={onChangeCode}
                    />
                </div>

                <CheckBox
                    value={trustDevice}
                    onChange={setTrustDevice}
                    label={t('Запомнить это устройство на 30 дней')}
                />

                {error && <div className={cls.error}>{error}</div>}
                {!error && resendMessage && <div className={cls.success}>{resendMessage}</div>}

                <VStack gap="16" align="center">
                    <Button
                        type="submit"
                        theme={ButtonTheme.BACKGROUND_INVERTED}
                        className={cls.submitBtn}
                        disabled={isVerifying || code.length !== 6}
                        fullWidth
                    >
                        {isVerifying ? t('Проверка...') : t('Подтвердить')}
                    </Button>

                    <Button
                        type="button"
                        theme={ButtonTheme.CLEAR}
                        disabled={isResending || secondsLeft > 0}
                        onClick={onResend}
                    >
                        {isResending
                            ? t('Отправка...')
                            : secondsLeft > 0
                                ? t('Отправить код повторно через {{seconds}} с', { seconds: secondsLeft })
                                : t('Отправить код повторно')}
                    </Button>

                    <Button type="button" theme={ButtonTheme.CLEAR} className={cls.back} onClick={onBack}>
                        {t('Назад')}
                    </Button>
                </VStack>
            </form>
        </Card>
    );
});

import { FormEvent, memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckBox } from '@/shared/ui/CheckBox';
import { Card } from '@/shared/ui/Card/Card';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { verifyTwoFactorCode } from '../../model/services/verifyTwoFactorCode/verifyTwoFactorCode';
import { resendTwoFactorCode } from '../../model/services/resendTwoFactorCode/resendTwoFactorCode';
import { TwoFactorFormHeader } from './TwoFactorFormHeader';
import { TwoFactorFormFields } from './TwoFactorFormFields';
import { TwoFactorFormActions } from './TwoFactorFormActions';
import cls from './TwoFactorForm.module.scss';

const RESEND_COOLDOWN_SECONDS = 60;

const useResendCooldown = () => {
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

    return { setResendAvailableAt, secondsLeft };
};

const FormMessage = ({ error, success }: { error?: string; success?: string }) => {
    if (error) {
        return <div className={cls.error}>{error}</div>;
    }
    if (success) {
        return <div className={cls.success}>{success}</div>;
    }
    return null;
};

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
    const { setResendAvailableAt, secondsLeft } = useResendCooldown();

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
    }, [dispatch, t, setResendAvailableAt]);

    return (
        <Card className={classNames(cls.TwoFactorForm, {}, [className])} padding="40">
            <form onSubmit={onSubmit}>
                <TwoFactorFormHeader maskedEmail={maskedEmail} />
                <TwoFactorFormFields code={code} onChangeCode={onChangeCode} />
                <CheckBox
                    value={trustDevice}
                    onChange={setTrustDevice}
                    label={t('Запомнить это устройство на 30 дней')}
                />
                <FormMessage error={error} success={!error ? resendMessage : undefined} />
                <TwoFactorFormActions
                    isVerifying={isVerifying}
                    codeLength={code.length}
                    isResending={isResending}
                    secondsLeft={secondsLeft}
                    onResend={onResend}
                    onBack={onBack}
                />
            </form>
        </Card>
    );
});

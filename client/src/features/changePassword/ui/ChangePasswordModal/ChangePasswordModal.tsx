import { memo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Modal } from '@/shared/ui/Modal/Modal';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { changePasswordThunk } from '../../model/services/changePasswordThunk';
import { ChangePasswordError } from '../../model/types/changePassword';
import { ChangePasswordFields } from './ChangePasswordFields';
import { ChangePasswordActions } from './ChangePasswordActions';
import cls from './ChangePasswordModal.module.scss';

interface ChangePasswordModalProps {
    className?: string;
    isOpen: boolean;
    onClose: () => void;
    profileId: string;
}

const getErrorText = (err: ChangePasswordError, t: (key: string) => string): string => {
    if (err === ChangePasswordError.PASSWORDS_DONT_MATCH) return t('Пароли не совпадают');
    if (err === ChangePasswordError.CURRENT_PASSWORD_INCORRECT) return t('Текущий пароль неверный');
    if (err === ChangePasswordError.SERVER_ERROR) return t('Ошибка сервера, попробуйте позже');
    if (err === ChangePasswordError.REQUIRED_FIELDS) return t('Заполните все поля');
    return '';
};

export const ChangePasswordModal = memo((props: ChangePasswordModalProps) => {
    const { className, isOpen, onClose, profileId } = props;
    const { t } = useTranslation('profile');
    const dispatch = useAppDispatch();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<ChangePasswordError[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const onSubmit = useCallback(async () => {
        setErrors([]);
        setIsLoading(true);

        const result = await dispatch(
            changePasswordThunk({ profileId, currentPassword, newPassword, confirmPassword })
        );

        setIsLoading(false);

        if (changePasswordThunk.fulfilled.match(result)) {
            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                onClose();
            }, 1500);
        } else if (changePasswordThunk.rejected.match(result)) {
            setErrors(result.payload as ChangePasswordError[]);
        }
    }, [dispatch, profileId, currentPassword, newPassword, confirmPassword, onClose]);

    const handleClose = useCallback(() => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setErrors([]);
        setIsSuccess(false);
        onClose();
    }, [onClose]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            lazy
            className={classNames('', {}, [className])}
        >
            <VStack gap="24" className={cls.content}>
                <Text title={t('Изменить пароль')} className={cls.title} />

                {errors.map((err) => (
                    <Text key={err} text={getErrorText(err, t)} variant="error" />
                ))}

                {isSuccess && <Text text={t('Пароль успешно изменён')} variant="accent" />}

                <ChangePasswordFields
                    currentPassword={currentPassword}
                    newPassword={newPassword}
                    confirmPassword={confirmPassword}
                    onChangeCurrent={setCurrentPassword}
                    onChangeNew={setNewPassword}
                    onChangeConfirm={setConfirmPassword}
                />

                <ChangePasswordActions isLoading={isLoading} onClose={handleClose} onSubmit={() => onSubmit()} />
            </VStack>
        </Modal>
    );
});

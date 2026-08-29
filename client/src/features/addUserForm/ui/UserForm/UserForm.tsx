import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import cls from './UserForm.module.scss';
import { memo, useCallback, useState } from 'react';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { newUserActions, newUserReducer } from '../../model/slices/newUserSlice';
import { useSelector } from 'react-redux';
import { getAddUserForm } from '../../model/selectors/getAddUserForm/getAddUserForm';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { addNewUser } from '../../model/services/addNewUser/addNewUser';
import { UserCard } from '@/entities/User';
import { RoleKey } from '@/entities/Role';
import { toast } from 'react-toastify';

interface AddUserFormProps {
    className?: string;
    onSuccess: () => void;
    reloadPage?: () => void;
}

const initialReducers: ReducersList = {
    newUser: newUserReducer,
};

const UserForm = memo((props: AddUserFormProps) => {
    const { className, onSuccess, reloadPage } = props;
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [file, setFile] = useState<File | null>(null);

    const formData = useSelector(getAddUserForm);

    const cleanForm = useCallback(() => {
        onChangeFirsttName('');
        onChangeLastName('');
        onChangeEmail('');
    }, [onSuccess]);

    const onChangeFirsttName = useCallback(
        (value?: string) => {
            dispatch(newUserActions.updateUserForm({ firstName: value ?? '' }));
        },
        [dispatch]
    );
    const onChangeLastName = useCallback(
        (value?: string) => {
            dispatch(newUserActions.updateUserForm({ lastName: value || '' }));
        },
        [dispatch]
    );
    const onChangeEmail = useCallback(
        (value?: string) => {
            dispatch(newUserActions.updateUserForm({ email: value || '' }));
        },
        [dispatch]
    );
    const onChangePassword = useCallback(
        (value?: string) => {
            dispatch(newUserActions.updateUserForm({ password: value || '' }));
        },
        [dispatch]
    );

    const onChangeUserRole = useCallback(
        (role: RoleKey) => {
            dispatch(newUserActions.updateUserForm({ role }));
        },
        [dispatch]
    );

    const onSave = useCallback(async () => {
        const result = await dispatch(addNewUser());
        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess();
            reloadPage?.();
            cleanForm();
            toast.success(t('Пользователь успешно добавлен'));
        }
    }, [onSuccess, file, cleanForm, dispatch, reloadPage]);

    return (
        <DynamicModuleLoader reducers={initialReducers}>
            <div className={classNames(cls.UserForm, {}, [className])}>
                <VStack gap="24" align="center" className={cls.header}>
                    <Text size="m" title={t('Добавление нового сотрудника')} bold />
                    <UserCard
                        onChangeLastName={onChangeLastName}
                        onChangeFirsttName={onChangeFirsttName}
                        onChangeUserRole={onChangeUserRole}
                        onChangePassword={onChangePassword}
                        onChangeEmail={onChangeEmail}
                        data={formData}
                    />
                    <Button fullWidth onClick={onSave} theme={ButtonTheme.BACKGROUND_INVERTED}>
                        {t('Добавить')}
                    </Button>
                </VStack>
            </div>
        </DynamicModuleLoader>
    );
});

export default UserForm;

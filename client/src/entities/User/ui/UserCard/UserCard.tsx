import cls from './UserCard.module.scss';
import { classNames, Mods } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/Input/Input';
import { RoleKey, RoleSelect } from '@/entities/Role';
import { IProfile, ServerError } from '@/entities/Profile';
import { VStack } from '@/shared/ui/Stack';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';

interface UserCardProps {
    className?: string;
    data?: IProfile;
    error?: ServerError;
    isLoading?: boolean;
    readonly?: boolean;
    onChangeLastName?: (value?: string) => void;
    onChangeEmail?: (value?: string) => void;
    onChangePassword?: (value?: string) => void;
    onChangeFirsttName?: (value?: string) => void;
    onChangeAvatar?: (value?: string) => void;
    onChangeUserRole?: (currency: RoleKey) => void;
}

export const UserCard = (props: UserCardProps) => {
    const {
        className,
        data,
        isLoading,
        readonly,
        onChangeFirsttName,
        onChangePassword,
        onChangeEmail,
        onChangeLastName,
        onChangeAvatar,
        onChangeUserRole,
    } = props;
    const { t } = useTranslation('profile');

    if (isLoading) {
        return (
            <div className={classNames(cls.ProfileCard, { [cls.loading]: true }, [className])}>
                <VStack gap="16" max>
                    <Skeleton width="100%" height={72} border="14px" />
                    <Skeleton width="100%" height={72} border="14px" />
                    <Skeleton width="100%" height={72} border="14px" />
                    <Skeleton width="100%" height={72} border="14px" />
                    <Skeleton width="100%" height={72} border="14px" />
                </VStack>
            </div>
        );
    }

    const mods: Mods = {
        [cls.editing]: !readonly,
    };

    return (
        <>
            <VStack className={cls.UserCard} gap="16" max>
                <Input
                    value={data?.firstName}
                    placeholder={t('Ваше Имя')}
                    label={t('Имя')}
                    className={cls.input}
                    onChange={onChangeFirsttName}
                    readonly={readonly}
                    fullWidth
                />
                <Input
                    value={data?.lastName}
                    placeholder={t('Ваша фамилия')}
                    label={t('Фамилия')}
                    className={cls.input}
                    onChange={onChangeLastName}
                    readonly={readonly}
                    fullWidth
                />
                <Input
                    value={data?.email}
                    placeholder={t('Введите email')}
                    label={t('Email')}
                    className={cls.input}
                    onChange={onChangeEmail}
                    readonly={readonly}
                    fullWidth
                />
                <Input
                    value={data?.password}
                    placeholder={t('Введите пароль')}
                    label={t('Пароль')}
                    className={cls.input}
                    onChange={onChangePassword}
                    readonly={readonly}
                    fullWidth
                />
                <Input
                    value={data?.avatar}
                    label={t('Ссылка на аватар')}
                    placeholder={t('Введите ссылку на аватар')}
                    className={cls.input}
                    onChange={onChangeAvatar}
                    readonly={readonly}
                    fullWidth
                />
                <RoleSelect
                    className={cls.input}
                    value={data?.role}
                    onChange={onChangeUserRole}
                    readonly={readonly}
                />
            </VStack>
        </>
    );
};

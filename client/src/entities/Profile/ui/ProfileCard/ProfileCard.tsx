import cls from './ProfileCard.module.scss';
import { classNames, Mods } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/Input/Input';
import { RoleKey, RoleSelect } from '@/entities/Role';
import { IProfile, ServerError } from '@/entities/Profile/model/types/profile';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { StateView } from '@/shared/ui/StateView';

interface ProfileCardProps {
    className?: string;
    data?: IProfile;
    error?: ServerError;
    isLoading?: boolean;
    readonly?: boolean;
    onChangeLastname?: (value?: string) => void;
    onChangeEmail?: (value?: string) => void;
    onChangeFirstname?: (value?: string) => void;
    onChangeAvatar?: (value?: string) => void;
    onChangeRole?: (currency: RoleKey) => void;
}

export const ProfileCard = (props: ProfileCardProps) => {
    const {
        className,
        data,
        isLoading,
        error,
        readonly,
        onChangeFirstname,
        onChangeEmail,
        onChangeLastname,
        onChangeAvatar,
        onChangeRole,
    } = props;
    const { t } = useTranslation('profile');

    if (isLoading) {
        return (
            <div className={classNames(cls.ProfileCard, {}, [className, cls.loading])}>
                <div className={cls.inner}>
                    <Skeleton width={160} height={20} border="8px" />
                    <div className={cls.fieldsGrid}>
                        <Skeleton width="100%" height={72} border="14px" />
                        <Skeleton width="100%" height={72} border="14px" />
                        <Skeleton className={cls.fieldFull} width="100%" height={72} border="14px" />
                        <Skeleton className={cls.fieldFull} width="100%" height={72} border="14px" />
                        <Skeleton className={cls.fieldFull} width="100%" height={72} border="14px" />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <StateView
                className={classNames(cls.ProfileCard, {}, [className, cls.error])}
                tone="error"
                title={t('Произошла ошибка при загрузке профиля')}
                text={t('Попробуйте обновить страницу')}
            />
        );
    }

    const mods: Mods = {
        [cls.editing]: !readonly,
    };

    return (
        <div className={classNames(cls.ProfileCard, mods, [className])}>
            <div className={cls.inner}>
                <div className={cls.sectionHeader}>
                    <span className={cls.sectionTitle}>{t('Личные данные')}</span>
                    <div className={cls.sectionLine} />
                </div>

                <div className={cls.fieldsGrid}>
                    <Input
                        value={data?.firstName}
                        placeholder={t('Ваше имя')}
                        label={t('Имя')}
                        onChange={onChangeFirstname}
                        readonly={readonly}
                        fullWidth
                    />
                    <Input
                        value={data?.lastName}
                        placeholder={t('Ваша фамилия')}
                        label={t('Фамилия')}
                        onChange={onChangeLastname}
                        readonly={readonly}
                        fullWidth
                    />
                    <Input
                        value={data?.email}
                        placeholder={t('Введите email')}
                        label={t('Email')}
                        onChange={onChangeEmail}
                        readonly={readonly}
                        fullWidth
                        className={cls.fieldFull}
                    />
                    <Input
                        value={data?.avatar}
                        placeholder={t('Введите ссылку на аватар')}
                        label={t('Ссылка на аватар')}
                        onChange={onChangeAvatar}
                        readonly={readonly}
                        fullWidth
                        className={cls.fieldFull}
                    />
                    <div className={cls.fieldFull}>
                        <RoleSelect
                            value={data?.role}
                            onChange={onChangeRole}
                            readonly={readonly}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

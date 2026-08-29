import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { getProfileData, profileActions } from '@/entities/Profile';
import { useCallback, useState } from 'react';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { classNames } from '@/shared/lib/classNames/classNames';
import { getProfileReadonly } from '@/entities/Profile';
import { updateProfileData } from '@/features/editProfile';
import cls from './ProfilePageHeader.module.scss';
import { getUserAuthData } from '@/entities/User';
import { RoleKey, RoleLabels } from '@/entities/Role/';
import { Avatar } from '@/shared/ui/Avatar/Avatar';
import { ChangePasswordModal } from '@/features/changePassword';

interface ProfilePageHeaderProps {
    className?: string;
}

export const ProfilePageHeader = (props: ProfilePageHeaderProps) => {
    const { className } = props;
    const { t } = useTranslation('profile');

    const authData = useSelector(getUserAuthData);
    const profileData = useSelector(getProfileData);

    const isCanEdit = authData?.id == profileData?.id || authData?.role === RoleKey.ADMIN;
    const isOwnProfile = authData?.id == profileData?.id;

    const readonly = useSelector(getProfileReadonly);
    const dispatch = useAppDispatch();

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const onEdit = useCallback(() => dispatch(profileActions.setReadonly(false)), [dispatch]);
    const onCancelEdit = useCallback(() => dispatch(profileActions.cancelEdit()), [dispatch]);
    const onSave = useCallback(() => dispatch(updateProfileData()), [dispatch]);

    const initials =
        profileData?.firstName && profileData?.lastName
            ? `${profileData.firstName[0]}${profileData.lastName[0]}`.toUpperCase()
            : profileData?.firstName
              ? profileData.firstName[0].toUpperCase()
              : '?';

    const roleLabel = profileData?.role ? RoleLabels[profileData.role] : '';

    return (
        <div className={classNames(cls.ProfilePageHeader, {}, [className])}>
            <div className={cls.banner} />

            <div className={cls.body}>
                <div className={cls.left}>
                    <div className={cls.avatarWrap}>
                        {profileData?.avatar ? (
                            <Avatar src={profileData.avatar} size={46} />
                        ) : (
                            <div className={cls.avatarInitials}>{initials}</div>
                        )}
                    </div>

                    <div className={cls.info}>
                        <div className={cls.name}>
                            {profileData?.firstName} {profileData?.lastName}
                        </div>
                        {roleLabel && <span className={cls.badge}>{roleLabel}</span>}
                    </div>
                </div>

                {isCanEdit && (
                    <div className={cls.actions}>
                        {isOwnProfile && readonly && (
                            <Button
                                theme={ButtonTheme.OUTLINE}
                                onClick={() => setIsPasswordModalOpen(true)}
                            >
                                {t('Изменить пароль')}
                            </Button>
                        )}
                        {readonly ? (
                            <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onEdit}>
                                {t('Редактировать')}
                            </Button>
                        ) : (
                            <>
                                <Button theme={ButtonTheme.OUTLINE_RED} onClick={onCancelEdit}>
                                    {t('Отменить')}
                                </Button>
                                <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onSave}>
                                    {t('Сохранить')}
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {profileData?.id && (
                <ChangePasswordModal
                    isOpen={isPasswordModalOpen}
                    onClose={() => setIsPasswordModalOpen(false)}
                    profileId={String(profileData.id)}
                />
            )}
        </div>
    );
};

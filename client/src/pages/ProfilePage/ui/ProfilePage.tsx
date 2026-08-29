import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './ProfilePage.module.scss';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import {
    fetchProfileData,
    getProfileError,
    getProfileLoading,
    getProfileValidateErrors,
    profileActions,
    ProfileCard,
    profileReducer,
} from '@/entities/Profile';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useSelector } from 'react-redux';
import { getProfileForm, getProfileReadonly } from '@/entities/Profile';
import { ProfilePageHeader } from './ProfilePageHeader/ProfilePageHeader';
import { RoleKey } from '@/entities/Role';
import { Text } from '@/shared/ui/Text/Text';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import { useParams } from 'react-router-dom';
import { Page } from '@/widgets/Page/Page';
import { getUserAuthData } from '@/entities/User';
import { ActiveSessions } from './ActiveSessions/ActiveSessions';

const reducers: ReducersList = {
    profile: profileReducer,
};

interface ProfilePageProps {
    className?: string;
}

const ProfilePage = ({ className }: ProfilePageProps) => {
    const { t } = useTranslation('profile');
    const { id } = useParams<{ id: string }>();
    const dispatch = useAppDispatch();
    const formData = useSelector(getProfileForm);
    const isLoading = useSelector(getProfileLoading);
    const error = useSelector(getProfileError);
    const readonly = useSelector(getProfileReadonly);
    const validateErrors = useSelector(getProfileValidateErrors);
    const authData = useSelector(getUserAuthData);
    const isOwnProfile = Boolean(authData?.id && id && String(authData.id) === String(id));

    const validateErrorsTranslate = {
        INCORRECT_USER_DATA: t('incorrect_user_data'),
        INCORRECT_AGE: t('incorrect_age'),
        INCORRECT_COUNTRY: t('incorrect_country'),
        INCORRECT_CITY: t('incorrect_city'),
        INCORRECT_USERNAME: t('incorrect_username'),
        NO_DATA: t('incorrect_data'),
        INCORRECT_EMAIL: t('incorrect_email'),
        INCORRECT_PASSWORD: t('incorrect_password'),
        SERVER_ERROR: t('server_error'),
        EMAIL_ALREADY_EXISTS: t('email_already_exists'),
    };

    useInitialEffect(() => {
        if (id) {
            dispatch(fetchProfileData(id));
        }
    });

    const onChangeFirstname = useCallback(
        (value?: string) => {
            dispatch(profileActions.updateProfile({ firstName: value || '' }));
        },
        [dispatch]
    );

    const onChangeLastname = useCallback(
        (value?: string) => {
            dispatch(profileActions.updateProfile({ lastName: value || '' }));
        },
        [dispatch]
    );

    const onChangeEmail = useCallback(
        (value?: string) => {
            dispatch(profileActions.updateProfile({ email: value || '' }));
        },
        [dispatch]
    );

    const onChangeAvatar = useCallback(
        (value?: string) => {
            dispatch(profileActions.updateProfile({ avatar: value || '' }));
        },
        [dispatch]
    );

    const onChangeRole = useCallback(
        (role: RoleKey) => {
            dispatch(profileActions.updateProfile({ role }));
        },
        [dispatch]
    );

    return (
        <DynamicModuleLoader reducers={reducers}>
            <Page className={classNames(cls.ProfilePage, {}, [className])}>
                <ProfilePageHeader />
                {validateErrors?.length &&
                    validateErrors.map((error) => (
                        <Text key={error} text={validateErrorsTranslate[error]} variant={'error'} />
                    ))}
                <ProfileCard
                    data={formData}
                    isLoading={isLoading}
                    error={error}
                    readonly={readonly}
                    onChangeFirstname={onChangeFirstname}
                    onChangeLastname={onChangeLastname}
                    onChangeAvatar={onChangeAvatar}
                    onChangeRole={onChangeRole}
                    onChangeEmail={onChangeEmail}
                />
                {isOwnProfile && <ActiveSessions />}
            </Page>
        </DynamicModuleLoader>
    );
};

export default memo(ProfilePage);

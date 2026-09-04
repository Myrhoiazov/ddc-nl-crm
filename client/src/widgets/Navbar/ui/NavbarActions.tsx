import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { HStack } from '@/shared/ui/Stack';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon/Icon';
import { ThemeSwitcher } from '@/shared/ui/ThemeSwitcher';
import { AvatarDropdown } from '@/features/avatarDropdown';
import { GlobalSearch } from '@/features/globalSearch';
import AddClientIcon from '@/shared/assets/icons/add_user_icon.svg';
import cls from './Navbar.module.scss';

interface NavbarActionsProps {
    isAdmin: boolean;
    unreadEmailCount: number;
    onOpenAddClientModal: () => void;
}

export const NavbarActions = memo(({ isAdmin, unreadEmailCount, onOpenAddClientModal }: NavbarActionsProps) => {
    const { i18n, t } = useTranslation();

    const onLanguageChange = (lang: string) => () => {
        i18n.changeLanguage(lang);
    };

    return (
        <HStack className={cls.actions} justify="end" gap="8">
            <Button
                theme={ButtonTheme.BACKGROUND_INVERTED}
                className={cls.addClientBtn}
                onClick={onOpenAddClientModal}
            >
                <span className={cls.addClientLabel}>{t('Добавить клиента')}</span>
                <Icon Svg={AddClientIcon} width={20} color="fill" />
            </Button>
            <GlobalSearch />
            <div className={cls.langGroup} aria-label="Выбор языка">
                {['ua', 'en', 'ru'].map((lang) => (
                    <button
                        key={lang}
                        type="button"
                        className={classNames(cls.langButton, { [cls.activeLang]: i18n.language === lang }, [])}
                        onClick={onLanguageChange(lang)}
                    >
                        {lang.toUpperCase()}
                    </button>
                ))}
            </div>
            {isAdmin && (
                <button className={cls.notification} type="button" aria-label="Непрочитанные письма">
                    <span className={cls.bell}>{t('⌾')}</span>
                    {unreadEmailCount > 0 && (
                        <span className={cls.badge}>{unreadEmailCount > 99 ? '99+' : unreadEmailCount}</span>
                    )}
                </button>
            )}
            <ThemeSwitcher className={cls.themeSwitcher} />
            <AvatarDropdown />
        </HStack>
    );
});
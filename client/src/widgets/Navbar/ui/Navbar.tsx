import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Navbar.module.scss';
import { memo, useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getUserAuthData } from '@/entities/User';
import { RoleKey } from '@/entities/Role';
import { HStack } from '@/shared/ui/Stack';
import { AvatarDropdown } from '@/features/avatarDropdown';
import { AppImage } from '@/shared/ui/AppImage';
import Logo from '@/shared/assets/logo/ddc_logo.png';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon/Icon';
import AddClientIcon from '@/shared/assets/icons/add_user_icon.svg';
import { ClientFormModal } from '@/features/addClientForm';
import { GlobalSearch } from '@/features/globalSearch';
import { CLIENT_CREATED_EVENT, EMAIL_MESSAGES_UPDATED_EVENT } from '@/shared/const/events';
import { fetchUnreadEmailCount } from '@/entities/EmailMessage';
import { ThemeSwitcher } from '@/shared/ui/ThemeSwitcher';

const UNREAD_EMAIL_POLL_MS = 60000;

interface NavbarProps {
    className?: string;
    onMobileMenuToggle?: () => void;
}

export const Navbar = memo(({ className, onMobileMenuToggle }: NavbarProps) => {
    const authData = useSelector(getUserAuthData);
    const isAdmin = authData?.role === RoleKey.ADMIN;
    const { i18n, t } = useTranslation();
    const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
    const [unreadEmailCount, setUnreadEmailCount] = useState(0);

    const onOpenAddClientModal = useCallback(() => {
        setIsAddClientModalOpen(true);
    }, []);

    const onCloseAddClientModal = useCallback(() => {
        setIsAddClientModalOpen(false);
    }, []);

    // ClientsPage owns its own client list state; Navbar (a widget) must not reach
    // into a page's internals, so a plain DOM event signals "refresh if you're listening".
    const onClientCreated = useCallback(() => {
        window.dispatchEvent(new Event(CLIENT_CREATED_EVENT));
    }, []);

    // The email module (and its unread count) is admin-only, both server- and
    // client-side, so non-admins never even issue this request.
    useEffect(() => {
        if (!isAdmin) {
            return undefined;
        }

        const loadUnreadCount = () => {
            fetchUnreadEmailCount().then(setUnreadEmailCount).catch(() => {});
        };

        loadUnreadCount();
        const interval = setInterval(loadUnreadCount, UNREAD_EMAIL_POLL_MS);
        window.addEventListener(EMAIL_MESSAGES_UPDATED_EVENT, loadUnreadCount);

        return () => {
            clearInterval(interval);
            window.removeEventListener(EMAIL_MESSAGES_UPDATED_EVENT, loadUnreadCount);
        };
    }, [isAdmin]);

    if (!authData) {
        return;
    }

    const onLanguageChange = (lang: string) => () => {
        i18n.changeLanguage(lang);
    };

    return (
        <div className={classNames(cls.Navbar, {}, [className])}>
            <div className={cls.left}>
                <button className={cls.hamburger} onClick={onMobileMenuToggle} aria-label="Меню">
                    <span /><span /><span />
                </button>
                <AppImage src={Logo} alt="DDC" className={cls.logo} />
            </div>
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
                        <span className={cls.bell}>⌾</span>
                        {unreadEmailCount > 0 && (
                            <span className={cls.badge}>{unreadEmailCount > 99 ? '99+' : unreadEmailCount}</span>
                        )}
                    </button>
                )}
                <ThemeSwitcher className={cls.themeSwitcher} />
                <AvatarDropdown />
            </HStack>

            <ClientFormModal
                isOpen={isAddClientModalOpen}
                onClose={onCloseAddClientModal}
                reloadPage={onClientCreated}
            />
        </div>
    );
});

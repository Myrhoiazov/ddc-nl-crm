import { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Button, ButtonSize, ButtonTheme } from '@/shared/ui/Button';
import { SidebarItem } from '../SidebarItem/SidebarItem';
import { SidebarItemGroup } from '../SidebarItemGroup/SidebarItemGroup';
import cls from './Sidebar.module.scss';
import { useSelector } from 'react-redux';
import { getSidebarItems } from '../../model/selectors/getSidebarItems';
import { useLocation } from 'react-router-dom';

interface SidebarProps {
    className?: string;
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}

// Sidebar auto-collapses to icon-only in this range so it doesn't crowd out page content;
// below it the mobile off-canvas overlay takes over, above it there's room for the full width.
const TABLET_COLLAPSE_QUERY = '(min-width: 769px) and (max-width: 1024px)';

export const Sidebar = memo(({ className, mobileOpen, onMobileClose }: SidebarProps) => {
    const { t } = useTranslation();
    const [collapsed, setCollapsed] = useState(false);
    const [openGroup, setOpenGroup] = useState<string | null>(null);
    const userToggledRef = useRef(false);
    const sidebarItemsList = useSelector(getSidebarItems);
    const { pathname } = useLocation();

    // Close mobile sidebar on navigation
    useEffect(() => {
        onMobileClose?.();
    }, [pathname]);

    // Auto-collapse on tablet widths unless the user has already toggled it manually
    useEffect(() => {
        const mql = window.matchMedia(TABLET_COLLAPSE_QUERY);
        const handleChange = (e: MediaQueryList | MediaQueryListEvent) => {
            if (!userToggledRef.current) {
                setCollapsed(e.matches);
            }
        };
        handleChange(mql);
        mql.addEventListener('change', handleChange);
        return () => mql.removeEventListener('change', handleChange);
    }, []);

    const onToggle = () => {
        userToggledRef.current = true;
        setCollapsed((prev) => !prev);
    };

    const [mainItems, crmItems] = useMemo(
        () => [
            (sidebarItemsList ?? []).slice(0, 1),
            (sidebarItemsList ?? []).slice(1),
        ],
        [sidebarItemsList],
    );

    // Whichever group currently contains the active route should be open by default,
    // and opening it should close any other group (accordion behavior).
    const activeGroupKey = useMemo(() => {
        const groups = sidebarItemsList ?? [];
        const active = groups.find((item) => item.children?.some(
            (child) => pathname === child.path || pathname.startsWith(child.path + '/'),
        ));
        return active?.text ?? null;
    }, [sidebarItemsList, pathname]);

    useEffect(() => {
        if (activeGroupKey) {
            setOpenGroup(activeGroupKey);
        }
    }, [activeGroupKey]);

    const onGroupToggle = useCallback((key: string) => {
        setOpenGroup((prev) => (prev === key ? null : key));
    }, []);

    const renderItems = (items: typeof sidebarItemsList) => items.map((item) =>
        item.children?.length ? (
            <SidebarItemGroup
                item={item}
                key={item.text}
                collapsed={collapsed}
                isOpen={openGroup === item.text}
                onToggle={onGroupToggle}
            />
        ) : (
            <SidebarItem item={item} key={item.text} collapsed={collapsed} />
        ),
    );

    return (
        <>
            {/* Mobile overlay backdrop */}
            {mobileOpen && (
                <div className={cls.backdrop} onClick={onMobileClose} />
            )}

            <div
                data-testid="sidebar"
                className={classNames(
                    cls.Sidebar,
                    { [cls.collapsed]: collapsed, [cls.mobileOpen]: !!mobileOpen },
                    [className],
                )}
            >
                {/* Mobile close button */}
                <button className={cls.mobileClose} onClick={onMobileClose} aria-label="Закрыть">
                    {t('✕')}
                </button>

                <Button
                    data-testid="sidebar-toggle"
                    onClick={onToggle}
                    className={cls.collapseBtn}
                    theme={ButtonTheme.BACKGROUND_INVERTED}
                    size={ButtonSize.L}
                    square
                >
                    {collapsed ? '›' : '‹'}
                </Button>

                <div className={cls.items}>
                    {!collapsed && <div className={cls.sectionTitle}>{t('Навигация')}</div>}
                    {renderItems(mainItems)}
                    {!collapsed && <div className={cls.sectionTitle}>{t('CRM разделы')}</div>}
                    {renderItems(crmItems)}
                </div>
            </div>
        </>
    );
});

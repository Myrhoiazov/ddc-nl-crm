import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Button, ButtonSize, ButtonTheme } from '@/shared/ui/Button';
import { SidebarItem } from '../SidebarItem/SidebarItem';
import { SidebarItemGroup } from '../SidebarItemGroup/SidebarItemGroup';
import cls from './Sidebar.module.scss';
import { SidebarItemType } from '../../model/types/sidebar';
import { useSidebarState } from './useSidebarState';

interface SidebarProps {
    className?: string;
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}

export const Sidebar = memo(({ className, mobileOpen, onMobileClose }: SidebarProps) => {
    const { t } = useTranslation();
    const { collapsed, openGroup, mainItems, crmItems, onToggle, onGroupToggle } = useSidebarState({
        onMobileClose,
    });

    const renderItems = (items: SidebarItemType[]) => items.map((item) =>
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

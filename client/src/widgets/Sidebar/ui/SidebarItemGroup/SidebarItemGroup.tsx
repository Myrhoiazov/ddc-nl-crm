import { memo } from 'react';
import { useLocation } from 'react-router-dom';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Icon } from '@/shared/ui/Icon/Icon';
import { SidebarItemType } from '../../model/types/sidebar';
import { SidebarItem } from '../SidebarItem/SidebarItem';
import cls from './SidebarItemGroup.module.scss';

interface SidebarItemGroupProps {
    item: SidebarItemType;
    collapsed: boolean;
    isOpen: boolean;
    onToggle: (key: string) => void;
}

export const SidebarItemGroup = memo(({ item, collapsed, isOpen, onToggle }: SidebarItemGroupProps) => {
    const { pathname } = useLocation();

    const isChildActive = item.children?.some(
        (child) => pathname === child.path || pathname.startsWith(child.path + '/'),
    ) ?? false;

    if (collapsed) {
        return (
            <div className={cls.collapsedGroup}>
                <div className={classNames(cls.trigger, { [cls.active]: isChildActive })}>
                    <Icon
                        Svg={item.Icon}
                        width={20}
                        height={20}
                        className={cls.icon}
                        color={item.iconColor ?? 'fill'}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={cls.group}>
            <button
                className={classNames(cls.trigger, { [cls.active]: isChildActive, [cls.open]: isOpen })}
                onClick={() => onToggle(item.text)}
                type="button"
            >
                <Icon
                    Svg={item.Icon}
                    width={20}
                    height={20}
                    className={cls.icon}
                    color={item.iconColor ?? 'fill'}
                />
                <span className={cls.label}>{item.text}</span>
                <span className={classNames(cls.arrow, { [cls.arrowOpen]: isOpen })}>›</span>
            </button>

            <div
                className={classNames(cls.childrenWrapper, { [cls.childrenOpen]: isOpen })}
                aria-hidden={!isOpen}
            >
                <div className={cls.children}>
                    {item.children?.map((child) => (
                        <SidebarItem
                            key={child.path}
                            item={child}
                            collapsed={false}
                            nested
                        />
                    ))}
                </div>
            </div>
        </div>
    );
});

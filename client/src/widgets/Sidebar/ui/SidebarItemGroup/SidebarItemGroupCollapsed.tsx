import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Icon } from '@/shared/ui/Icon/Icon';
import { SidebarItemType } from '../../model/types/sidebar';
import cls from './SidebarItemGroup.module.scss';

interface SidebarItemGroupCollapsedProps {
    item: SidebarItemType;
    isChildActive: boolean;
}

export const SidebarItemGroupCollapsed = memo(({ item, isChildActive }: SidebarItemGroupCollapsedProps) => (
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
));
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { getSidebarItems } from '../../model/selectors/getSidebarItems';
import { SidebarItemType } from '../../model/types/sidebar';

// Sidebar auto-collapses to icon-only in this range so it doesn't crowd out page content;
// below it the mobile off-canvas overlay takes over, above it there's room for the full width.
const TABLET_COLLAPSE_QUERY = '(min-width: 769px) and (max-width: 1024px)';

export interface UseSidebarStateOptions {
    onMobileClose?: () => void;
}

export const useSidebarState = ({ onMobileClose }: UseSidebarStateOptions) => {
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

    return {
        collapsed,
        openGroup,
        mainItems,
        crmItems,
        sidebarItemsList: sidebarItemsList as SidebarItemType[] | undefined,
        onToggle,
        onGroupToggle,
    };
};
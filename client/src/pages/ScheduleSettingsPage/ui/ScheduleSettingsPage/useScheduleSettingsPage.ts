import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import {
    DanceGroup,
    DanceGroupsResponse,
    Choreographer,
    GroupManagementStatistics,
} from '@/entities/DanceGroup';

export type BranchViewMode = 'flat' | 'groups';

export interface UseScheduleSettingsPageResult {
    groups: DanceGroup[];
    total: number;
    loading: boolean;
    statistics: GroupManagementStatistics | null;
    styles: string[];
    choreographers: Choreographer[];
    filterStyle: string;
    setFilterStyle: (value: string) => void;
    filterChoreographer: string;
    setFilterChoreographer: (value: string) => void;
    filterLevel: string;
    setFilterLevel: (value: string) => void;
    createOpen: boolean;
    setCreateOpen: (value: boolean) => void;
    editGroup: DanceGroup | null;
    branchView: Record<number, BranchViewMode>;
    getBranchView: (branchId: number) => BranchViewMode;
    setBranchViewMode: (branchId: number, mode: BranchViewMode) => void;
    openBranches: Set<number>;
    onToggleBranch: (branchId: number) => (event: SyntheticEvent<HTMLDetailsElement>) => void;
    highlightedGroupId: number | null;
    groupCardRefs: React.RefObject<Record<number, HTMLDivElement | null>>;
    onDeleteGroup: (id: number) => void;
    onReset: () => void;
    onEdit: (group: DanceGroup) => void;
    onCloseCreate: () => void;
    onSaved: () => void;
}

export const useScheduleSettingsPage = (): UseScheduleSettingsPageResult => {
    const [groups, setGroups] = useState<DanceGroup[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [statistics, setStatistics] = useState<GroupManagementStatistics | null>(null);

    const [styles, setStyles] = useState<string[]>([]);
    const [choreographers, setChoreographers] = useState<Choreographer[]>([]);

    const [filterStyle, setFilterStyle] = useState('');
    const [filterChoreographer, setFilterChoreographer] = useState('');
    const [filterLevel, setFilterLevel] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [editGroup, setEditGroup] = useState<DanceGroup | null>(null);

    const fetchGroups = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filterStyle) params.style = filterStyle;
            if (filterChoreographer) params.choreographerId = filterChoreographer;
            if (filterLevel) params.level = filterLevel;

            const res = await $apiPrivate.get<DanceGroupsResponse>('/schedule/groups', { params });
            setGroups(res.data.data);
            setTotal(res.data.total);
        } finally {
            setLoading(false);
        }
    }, [filterStyle, filterChoreographer, filterLevel]);

    const fetchStatistics = useCallback(async () => {
        const res = await $apiPrivate.get<GroupManagementStatistics>('/schedule/groups-management/stats');
        setStatistics(res.data);
    }, []);

    useEffect(() => { fetchGroups(); }, [fetchGroups]);
    useEffect(() => { fetchStatistics(); }, [fetchStatistics]);

    useEffect(() => {
        $apiPrivate.get<string[]>('/schedule/styles').then((r) => setStyles(r.data));
        $apiPrivate.get<Choreographer[]>('/schedule/choreographers').then((r) => setChoreographers(r.data));
    }, []);

    const onDeleteGroup = useCallback(async (id: number) => {
        if (!window.confirm('Удалить группу?')) return;
        try {
            await $apiPrivate.delete(`/schedule/groups/${id}`);
            toast.success('Группа удалена');
            fetchGroups();
            fetchStatistics();
        } catch {
            toast.error('Не удалось удалить группу');
        }
    }, [fetchGroups, fetchStatistics]);

    const onReset = useCallback(() => {
        setFilterStyle('');
        setFilterChoreographer('');
        setFilterLevel('');
    }, []);

    const onEdit = useCallback((group: DanceGroup) => {
        setEditGroup(group);
        setCreateOpen(true);
    }, []);

    const onCloseCreate = useCallback(() => {
        setCreateOpen(false);
        setEditGroup(null);
    }, []);

    const onSaved = useCallback(() => {
        fetchGroups();
        fetchStatistics();
    }, [fetchGroups, fetchStatistics]);

    const [branchView, setBranchView] = useState<Record<number, BranchViewMode>>({});
    const getBranchView = useCallback((branchId: number) => branchView[branchId] ?? 'flat', [branchView]);
    const setBranchViewMode = useCallback((branchId: number, mode: BranchViewMode) => {
        setBranchView((prev) => ({ ...prev, [branchId]: mode }));
    }, []);

    const [openBranches, setOpenBranches] = useState<Set<number>>(new Set());
    const onToggleBranch = useCallback((branchId: number) => (event: SyntheticEvent<HTMLDetailsElement>) => {
        const isOpen = event.currentTarget.open;
        setOpenBranches((prev) => {
            const next = new Set(prev);
            if (isOpen) next.add(branchId); else next.delete(branchId);
            return next;
        });
    }, []);

    const [searchParams] = useSearchParams();
    const highlightGroupId = searchParams.get('highlight');
    const [highlightedGroupId, setHighlightedGroupId] = useState<number | null>(null);
    const groupCardRefs = useRef<Record<number, HTMLDivElement | null>>({});

    useEffect(() => {
        if (!highlightGroupId || !statistics) return;

        const targetId = Number(highlightGroupId);
        const targetGroup = statistics.groups.find((group) => group.id === targetId);
        if (!targetGroup || targetGroup.branchId === null) return;

        const branchId = targetGroup.branchId;
        setBranchView((prev) => ({ ...prev, [branchId]: 'groups' }));
        setOpenBranches((prev) => new Set(prev).add(branchId));
        setHighlightedGroupId(targetId);
    }, [highlightGroupId, statistics]);

    useEffect(() => {
        if (!highlightedGroupId) return undefined;

        const node = groupCardRefs.current[highlightedGroupId];
        if (!node) return undefined;

        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const timeout = setTimeout(() => setHighlightedGroupId(null), 4000);
        return () => clearTimeout(timeout);
    }, [highlightedGroupId, branchView, openBranches]);

    return {
        groups,
        total,
        loading,
        statistics,
        styles,
        choreographers,
        filterStyle, setFilterStyle,
        filterChoreographer, setFilterChoreographer,
        filterLevel, setFilterLevel,
        createOpen, setCreateOpen,
        editGroup,
        branchView, getBranchView, setBranchViewMode,
        openBranches, onToggleBranch,
        highlightedGroupId,
        groupCardRefs,
        onDeleteGroup,
        onReset,
        onEdit,
        onCloseCreate,
        onSaved,
    };
};

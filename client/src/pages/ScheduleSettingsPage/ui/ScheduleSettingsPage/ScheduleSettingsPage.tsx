import {
    memo, useState, useEffect, useCallback, useRef, SyntheticEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Page } from '@/widgets/Page/Page';
import { $apiPrivate } from '@/shared/api/api';
import { getRouteClientDetails } from '@/shared/const/router';
import { classNames } from '@/shared/lib/classNames/classNames';
import {
    DanceGroup,
    DanceGroupsResponse,
    Choreographer,
    GroupManagementStatistics,
    GroupStudent,
} from '@/entities/DanceGroup';
import { GroupCard } from '../GroupCard/GroupCard';
import { CreateGroupModal } from '../CreateGroupModal/CreateGroupModal';
import { toast } from 'react-toastify';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';
import { StateView } from '@/shared/ui/StateView';
import s from './ScheduleSettingsPage.module.scss';

const studentName = (student: GroupStudent) => (
    [student.firstName, student.lastName].filter(Boolean).join(' ') || student.email || `Ученик #${student.id}`
);

const StudentLink = ({ student }: { student: GroupStudent }) => (
    <Link to={getRouteClientDetails(String(student.id))} className={s.studentLink}>
        {studentName(student)}
    </Link>
);

const ScheduleSettingsPage = memo(() => {
    const { t } = useTranslation();
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

    const onDeleteGroup = async (id: number) => {
        if (!window.confirm('Удалить группу?')) return;
        try {
            await $apiPrivate.delete(`/schedule/groups/${id}`);
            toast.success('Группа удалена');
            fetchGroups();
            fetchStatistics();
        } catch {
            toast.error('Не удалось удалить группу');
        }
    };

    const onReset = () => {
        setFilterStyle('');
        setFilterChoreographer('');
        setFilterLevel('');
    };

    const onEdit = (group: DanceGroup) => {
        setEditGroup(group);
        setCreateOpen(true);
    };

    const onCloseCreate = () => {
        setCreateOpen(false);
        setEditGroup(null);
    };

    const allTotal = groups.length;

    const [branchView, setBranchView] = useState<Record<number, 'flat' | 'groups'>>({});
    const getBranchView = (branchId: number) => branchView[branchId] ?? 'flat';
    const setBranchViewMode = (branchId: number, mode: 'flat' | 'groups') => {
        setBranchView((prev) => ({ ...prev, [branchId]: mode }));
    };

    // Управляемое состояние сворачивания карточек филиалов — нужно, чтобы переход
    // по ссылке "/schedule/groups?highlight=<id>" мог программно раскрыть нужный
    // филиал. Обычный клик по <summary> по-прежнему работает через onToggle.
    const [openBranches, setOpenBranches] = useState<Set<number>>(new Set());
    const onToggleBranch = (branchId: number) => (event: SyntheticEvent<HTMLDetailsElement>) => {
        const isOpen = event.currentTarget.open;
        setOpenBranches((prev) => {
            const next = new Set(prev);
            if (isOpen) next.add(branchId); else next.delete(branchId);
            return next;
        });
    };

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
        // Срабатывает один раз после загрузки статистики для конкретной ссылки —
        // повторный запуск при смене режимов/фильтров не нужен.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [highlightGroupId, statistics]);

    useEffect(() => {
        if (!highlightedGroupId) return undefined;

        const node = groupCardRefs.current[highlightedGroupId];
        if (!node) return undefined;

        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const timeout = setTimeout(() => setHighlightedGroupId(null), 4000);
        return () => clearTimeout(timeout);
    }, [highlightedGroupId, branchView, openBranches]);

    return (
        <Page>
            <h1 className={s.pageTitle}>{t('Управление группами')}</h1>

            <div className={s.toolbar}>
                <button className={s.primaryBtn} onClick={() => setCreateOpen(true)}>
                    {t('+ Создать группу')}
                </button>
            </div>

            {statistics && (
                <>
                    <div className={s.summaryGrid}>
                        <div className={s.summaryCard}><span>{t('Филиалы')}</span><strong>{statistics.totals.branchCount}</strong></div>
                        <div className={s.summaryCard}><span>{t('Группы')}</span><strong>{statistics.totals.groupCount}</strong></div>
                        <div className={s.summaryCard}><span>{t('Активные ученики')}</span><strong>{statistics.totals.activeCount}</strong></div>
                        <div className={s.summaryCard}><span>{t('Неактивные ученики')}</span><strong>{statistics.totals.inactiveCount}</strong></div>
                        <div className={s.summaryCard}><span>{t('Общая вместимость')}</span><strong>{statistics.totals.capacity}</strong></div>
                    </div>

                    <div className={s.branchSection}>
                        <div className={s.sectionTitle}>{t('Статистика по филиалам')}</div>
                        <div className={s.branchGrid}>
                            {statistics.branches.map((branch) => (
                                <details
                                    className={s.branchCard}
                                    key={branch.id}
                                    open={openBranches.has(branch.id)}
                                    onToggle={onToggleBranch(branch.id)}
                                >
                                    <summary>
                                        <span>
                                            <strong>{branch.name}</strong>
                                            <small>{[branch.city, branch.address].filter(Boolean).join(' · ')}</small>
                                        </span>
                                        <span className={s.branchNumbers}>
                                            {branch.groupCount}{t(' гр. · ')}{branch.activeCount}{t(' активных · ')}{branch.inactiveCount}{t(' неактивных')}
                                        </span>
                                    </summary>
                                    <div className={s.branchDetails}>
                                        <span>{t('Вместимость групп: {{capacity}}', { capacity: branch.capacity })}</span>
                                        <span>{t('Без группы: {{count}}', { count: branch.unassignedCount })}</span>
                                    </div>

                                    <div className={s.viewToggle}>
                                        <button
                                            type="button"
                                            className={getBranchView(branch.id) === 'flat' ? s.viewToggleActive : ''}
                                            onClick={() => setBranchViewMode(branch.id, 'flat')}
                                        >
                                            {t('Общий список')}
                                        </button>
                                        <button
                                            type="button"
                                            className={getBranchView(branch.id) === 'groups' ? s.viewToggleActive : ''}
                                            onClick={() => setBranchViewMode(branch.id, 'groups')}
                                        >
                                            {t('По группам')}
                                        </button>
                                    </div>

                                    {getBranchView(branch.id) === 'flat' ? (
                                        <div className={s.branchStudents}>
                                            <div>
                                                <strong>{t('Активные ({{count}})', { count: branch.activeCount })}</strong>
                                                {branch.activeStudents.length ? (
                                                    <ul>
                                                        {branch.activeStudents.map((student) => (
                                                            <li key={student.id}><StudentLink student={student} /></li>
                                                        ))}
                                                    </ul>
                                                ) : <span>{t('Нет учеников')}</span>}
                                            </div>
                                            <div>
                                                <strong>{t('Неактивные ({{count}})', { count: branch.inactiveCount })}</strong>
                                                {branch.inactiveStudents.length ? (
                                                    <ul>
                                                        {branch.inactiveStudents.map((student) => (
                                                            <li key={student.id}><StudentLink student={student} /></li>
                                                        ))}
                                                    </ul>
                                                ) : <span>{t('Нет учеников')}</span>}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={s.branchGroups}>
                                            {statistics.groups.filter((group) => group.branchId === branch.id).length === 0 ? (
                                                <span>{t('В этом филиале нет групп')}</span>
                                            ) : (
                                                statistics.groups
                                                    .filter((group) => group.branchId === branch.id)
                                                    .map((group) => (
                                                        <div
                                                            className={classNames(s.groupCard, {
                                                                [s.groupCardHighlighted]: highlightedGroupId === group.id,
                                                            }, [])}
                                                            key={group.id}
                                                            ref={(node) => { groupCardRefs.current[group.id] = node; }}
                                                        >
                                                            <div className={s.groupCardHeader}>
                                                                <strong>{group.name}</strong>
                                                                <span>{group.activeCount}{t(' активных · ')}{group.inactiveCount}{t(' неактивных')}</span>
                                                            </div>
                                                            <div className={s.branchStudents}>
                                                                <div>
                                                                    <strong>{t('Активные ({{count}})', { count: group.activeCount })}</strong>
                                                                    {group.activeStudents.length ? (
                                                                        <ul>
                                                                            {group.activeStudents.map((student) => (
                                                                                <li key={student.id}><StudentLink student={student} /></li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : <span>{t('Нет учеников')}</span>}
                                                                </div>
                                                                <div>
                                                                    <strong>{t('Неактивные ({{count}})', { count: group.inactiveCount })}</strong>
                                                                    {group.inactiveStudents.length ? (
                                                                        <ul>
                                                                            {group.inactiveStudents.map((student) => (
                                                                                <li key={student.id}><StudentLink student={student} /></li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : <span>{t('Нет учеников')}</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                            )}
                                        </div>
                                    )}
                                </details>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <div className={s.section}>
                <div className={s.sectionTitle}>
                    {t('Группы ({{allTotal}}/{{total}})', { allTotal, total })}
                </div>

                <div className={s.filters}>
                    <select className={s.filterSelect} value={filterStyle} onChange={(e) => setFilterStyle(e.target.value)}>
                        <option value="">{t('Все стили')}</option>
                        {styles.map((st) => <option key={st} value={st}>{st}</option>)}
                    </select>

                    <select className={s.filterSelect} value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
                        <option value="">{t('Все уровни')}</option>
                        <option value="START">{t('Start')}</option>
                        <option value="FAN">{t('Fan')}</option>
                        <option value="PRO">{t('Pro')}</option>
                    </select>

                    <select className={s.filterSelect} value={filterChoreographer} onChange={(e) => setFilterChoreographer(e.target.value)}>
                        <option value="">{t('Все хореографы')}</option>
                        {choreographers.map((c) => (
                            <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                        ))}
                    </select>

                    <button className={s.resetBtn} onClick={onReset}>{t('Сбросить')}</button>
                </div>

                {loading ? (
                    <ListSkeleton rows={5} height={146} />
                ) : groups.length === 0 ? (
                    <StateView
                        className={s.empty}
                        title="Группы не найдены"
                        text="Создайте первую группу и привяжите её к филиалу, чтобы ученики могли попадать в нужное расписание."
                    />
                ) : (
                    <div className={s.list}>
                        {groups.map((group) => (
                            <GroupCard
                                key={group.id}
                                group={group}
                                statistics={statistics?.groups.find((item) => item.id === group.id)}
                                onEdit={onEdit}
                                onDelete={onDeleteGroup}
                            />
                        ))}
                    </div>
                )}
            </div>

            <CreateGroupModal
                isOpen={createOpen}
                onClose={onCloseCreate}
                onSaved={() => {
                    fetchGroups();
                    fetchStatistics();
                }}
                editGroup={editGroup}
            />
        </Page>
    );
});

export default ScheduleSettingsPage;

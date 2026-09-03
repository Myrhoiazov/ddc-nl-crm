import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { DanceGroup, Choreographer, GroupManagementStatistics } from '@/entities/DanceGroup';
import { GroupCard } from '../GroupCard/GroupCard';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';
import { StateView } from '@/shared/ui/StateView';
import s from './ScheduleSettingsPage.module.scss';

interface GroupsListSectionProps {
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
    onReset: () => void;
    onEdit: (group: DanceGroup) => void;
    onDeleteGroup: (id: number) => void;
}

export const GroupsListSection = memo((props: GroupsListSectionProps) => {
    const { t } = useTranslation();
    const {
        groups, total, loading, statistics, styles, choreographers,
        filterStyle, setFilterStyle,
        filterChoreographer, setFilterChoreographer,
        filterLevel, setFilterLevel,
        onReset, onEdit, onDeleteGroup,
    } = props;

    const allTotal = groups.length;

    return (
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
    );
});

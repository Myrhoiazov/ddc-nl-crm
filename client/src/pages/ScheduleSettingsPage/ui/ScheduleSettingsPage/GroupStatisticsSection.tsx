import { memo, type RefObject, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getRouteClientDetails } from '@/shared/const/router';
import { classNames } from '@/shared/lib/classNames/classNames';
import { GroupManagementStatistics, GroupStudent } from '@/entities/DanceGroup';
import { BranchViewMode } from './useScheduleSettingsPage';
import s from './ScheduleSettingsPage.module.scss';

const studentName = (student: GroupStudent) => (
    [student.firstName, student.lastName].filter(Boolean).join(' ') || student.email || `Ученик #${student.id}`
);

const StudentLink = ({ student }: { student: GroupStudent }) => (
    <Link to={getRouteClientDetails(String(student.id))} className={s.studentLink}>
        {studentName(student)}
    </Link>
);

interface GroupStatisticsSectionProps {
    statistics: GroupManagementStatistics;
    getBranchView: (branchId: number) => BranchViewMode;
    setBranchViewMode: (branchId: number, mode: BranchViewMode) => void;
    openBranches: Set<number>;
    onToggleBranch: (branchId: number) => (event: SyntheticEvent<HTMLDetailsElement>) => void;
    highlightedGroupId: number | null;
    groupCardRefs: RefObject<Record<number, HTMLDivElement | null>>;
}

export const GroupStatisticsSection = memo((props: GroupStatisticsSectionProps) => {
    const { t } = useTranslation();
    const {
        statistics, getBranchView, setBranchViewMode,
        openBranches, onToggleBranch, highlightedGroupId, groupCardRefs,
    } = props;

    return (
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
    );
});

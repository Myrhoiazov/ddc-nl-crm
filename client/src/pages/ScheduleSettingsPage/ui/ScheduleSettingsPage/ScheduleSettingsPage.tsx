import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import s from './ScheduleSettingsPage.module.scss';
import { useScheduleSettingsPage } from './useScheduleSettingsPage';
import { GroupStatisticsSection } from './GroupStatisticsSection';
import { GroupsListSection } from './GroupsListSection';
import { CreateGroupModal } from '../CreateGroupModal/CreateGroupModal';

const ScheduleSettingsPage = memo(() => {
    const { t } = useTranslation();
    const {
        groups, total, loading, statistics, styles, choreographers,
        filterStyle, setFilterStyle,
        filterChoreographer, setFilterChoreographer,
        filterLevel, setFilterLevel,
        createOpen, setCreateOpen,
        editGroup,
        getBranchView, setBranchViewMode,
        openBranches, onToggleBranch,
        highlightedGroupId, groupCardRefs,
        onDeleteGroup, onReset, onEdit, onCloseCreate, onSaved,
    } = useScheduleSettingsPage();

    return (
        <Page>
            <h1 className={s.pageTitle}>{t('Управление группами')}</h1>

            <div className={s.toolbar}>
                <button className={s.primaryBtn} onClick={() => setCreateOpen(true)}>
                    {t('+ Создать группу')}
                </button>
            </div>

            {statistics && (
                <GroupStatisticsSection
                    statistics={statistics}
                    getBranchView={getBranchView}
                    setBranchViewMode={setBranchViewMode}
                    openBranches={openBranches}
                    onToggleBranch={onToggleBranch}
                    highlightedGroupId={highlightedGroupId}
                    groupCardRefs={groupCardRefs}
                />
            )}

            <GroupsListSection
                groups={groups}
                total={total}
                loading={loading}
                statistics={statistics}
                styles={styles}
                choreographers={choreographers}
                filterStyle={filterStyle}
                setFilterStyle={setFilterStyle}
                filterChoreographer={filterChoreographer}
                setFilterChoreographer={setFilterChoreographer}
                filterLevel={filterLevel}
                setFilterLevel={setFilterLevel}
                onReset={onReset}
                onEdit={onEdit}
                onDeleteGroup={onDeleteGroup}
            />

            <CreateGroupModal
                isOpen={createOpen}
                onClose={onCloseCreate}
                onSaved={onSaved}
                editGroup={editGroup}
            />
        </Page>
    );
});

export default ScheduleSettingsPage;

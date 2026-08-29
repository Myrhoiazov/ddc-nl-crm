import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Page } from '@/widgets/Page/Page';
import { $apiPrivate } from '@/shared/api/api';
import { toast } from 'react-toastify';
import { BranchCard, Branch } from '../BranchCard/BranchCard';
import { BranchModal } from '../BranchModal/BranchModal';
import s from './BranchesPage.module.scss';

const BranchesPage = memo(() => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editBranch, setEditBranch] = useState<Branch | null>(null);

    const fetchBranches = useCallback(async () => {
        setLoading(true);
        try {
            const res = await $apiPrivate.get<Branch[]>('/company/branches');
            setBranches(res.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBranches(); }, [fetchBranches]);

    const onDelete = async (id: number) => {
        if (!window.confirm('Удалить филиал?')) return;
        try {
            await $apiPrivate.delete(`/company/branches/${id}`);
            toast.success('Филиал удалён');
            fetchBranches();
        } catch {
            toast.error('Не удалось удалить филиал');
        }
    };

    const onEdit = (branch: Branch) => {
        setEditBranch(branch);
        setModalOpen(true);
    };

    const onClose = () => {
        setModalOpen(false);
        setEditBranch(null);
    };
    const query = (searchParams.get('_q') ?? '').trim().toLowerCase();
    const filteredBranches = useMemo(() => branches.filter((branch) => (
        !query || [branch.name, branch.city, branch.address].filter(Boolean).join(' ').toLowerCase().includes(query)
    )), [branches, query]);

    return (
        <Page>
            <div className={s.header}>
                <h1 className={s.title}>{t('Филиалы')}</h1>
                <button className={s.addBtn} onClick={() => setModalOpen(true)}>
                    {t('+ Добавить филиал')}
                </button>
            </div>

            {loading ? (
                <div className={s.empty}>Загружаем филиалы...</div>
            ) : filteredBranches.length === 0 ? (
                <div className={s.emptyState}>
                    <div className={s.emptyIcon}>🏢</div>
                    <div className={s.emptyTitle}>{t('Филиалов пока нет')}</div>
                    <div className={s.emptyText}>{t('Добавьте первый филиал вашей студии')}</div>
                    <button className={s.addBtn} onClick={() => setModalOpen(true)}>
                        {t('+ Добавить филиал')}
                    </button>
                </div>
            ) : (
                <div className={s.list}>
                    {filteredBranches.map((branch) => (
                        <BranchCard
                            key={branch.id}
                            branch={branch}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}

            <BranchModal
                isOpen={modalOpen}
                onClose={onClose}
                onSaved={fetchBranches}
                editBranch={editBranch}
            />
        </Page>
    );
});

export default BranchesPage;

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Page } from '@/widgets/Page/Page';
import { $apiPrivate } from '@/shared/api/api';
import { toast } from 'react-toastify';
import { ChoreographerCard, Choreographer } from '../ChoreographerCard/ChoreographerCard';
import { ChoreographerModal } from '../ChoreographerModal/ChoreographerModal';
import s from './ChoreographersPage.module.scss';

const ChoreographersPage = memo(() => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const [choreographers, setChoreographers] = useState<Choreographer[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editChoreographer, setEditChoreographer] = useState<Choreographer | null>(null);

    const fetchChoreographers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await $apiPrivate.get<Choreographer[]>('/schedule/choreographers');
            setChoreographers(res.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchChoreographers(); }, [fetchChoreographers]);

    const onEdit = (c: Choreographer) => { setEditChoreographer(c); setModalOpen(true); };
    const onClose = () => { setModalOpen(false); setEditChoreographer(null); };
    const query = (searchParams.get('_q') ?? '').trim().toLowerCase();
    const filteredChoreographers = useMemo(() => choreographers.filter((choreographer) => (
        !query || `${choreographer.firstName} ${choreographer.lastName}`.toLowerCase().includes(query)
    )), [choreographers, query]);

    const onDelete = async (id: number) => {
        if (!window.confirm('Удалить хореографа?')) return;
        try {
            await $apiPrivate.delete(`/schedule/choreographers/${id}`);
            toast.success('Удалён');
            fetchChoreographers();
        } catch {
            toast.error('Не удалось удалить');
        }
    };

    return (
        <Page>
            <div className={s.header}>
                <h1 className={s.title}>{t('Хореографы')}</h1>
                <button className={s.addBtn} onClick={() => setModalOpen(true)}>
                    {t('+ Добавить хореографа')}
                </button>
            </div>

            {loading ? (
                <div className={s.empty}>Загрузка...</div>
            ) : filteredChoreographers.length === 0 ? (
                <div className={s.emptyState}>
                    <div className={s.emptyTitle}>{t('Хореографов пока нет')}</div>
                    <div className={s.emptyText}>{t('Добавьте первого преподавателя студии')}</div>
                    <button className={s.addBtn} onClick={() => setModalOpen(true)}>
                        {t('+ Добавить хореографа')}
                    </button>
                </div>
            ) : (
                <div className={s.grid}>
                    {filteredChoreographers.map((c) => (
                        <ChoreographerCard
                            key={c.id}
                            choreographer={c}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}

            <ChoreographerModal
                isOpen={modalOpen}
                onClose={onClose}
                onSaved={fetchChoreographers}
                editChoreographer={editChoreographer}
            />
        </Page>
    );
});

export default ChoreographersPage;

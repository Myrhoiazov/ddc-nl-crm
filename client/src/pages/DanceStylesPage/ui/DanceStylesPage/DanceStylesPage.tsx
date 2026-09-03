import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { getStyleColorSlot } from '@/shared/lib/styleColor/styleColor';
import { useDanceStyles } from '../../useDanceStyles';
import { DanceStyleFormModal } from './DanceStyleFormModal';
import s from './DanceStylesPage.module.scss';

const DanceStylesPage = memo(() => {
    const { t } = useTranslation();
    const {
        items,
        search,
        setSearch,
        status,
        setStatus,
        sort,
        setSort,
        loading,
        modalOpen,
        setModalOpen,
        editingId,
        lang,
        setLang,
        form,
        saving,
        openCreate,
        openEdit,
        updateField,
        uploadImage,
        save,
        remove,
        toggle,
        resetFilters,
    } = useDanceStyles();
    const shown = useMemo(() => `${items.length}`, [items.length]);

    return (
        <Page>
            <div className={s.header}>
                <h1>{t('Стили / направления')}</h1>
                <button className={s.cta} onClick={openCreate}>{t('+ Добавить стиль')}</button>
            </div>

            <section className={s.filters}>
                <label>{t('Поиск')}<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="По названию или описанию" /></label>
                <label>{t('Статус')}<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">{t('Все')}</option><option value="active">{t('Включены')}</option><option value="inactive">{t('Выключены')}</option></select></label>
                <label>{t('Сортировка')}<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="name-asc">{t('По алфавиту: А → Я')}</option><option value="name-desc">{t('По алфавиту: Я → А')}</option><option value="newest">{t('Сначала новые')}</option></select></label>
                <button className={s.reset} onClick={resetFilters}>{t('Сбросить')}</button>
                <span className={s.count}>{t('Показано: {{shown}}', { shown })}</span>
            </section>

            {loading ? <div className={s.empty}>Загружаем стили...</div> : !items.length ? <div className={s.empty}>{t('Стили пока не добавлены.')}</div> : (
                <div className={s.grid}>
                    {items.map((item) => (
                        <article className={s.card} key={item.id}>
                            <div className={s.photo}>{item.image ? <img src={item.image} alt={item.name} /> : <span>{t('Нет фото')}</span>}</div>
                            <div className={s.cardTitle}><span className={`${s.swatch} ${s[`style${getStyleColorSlot(item.name)}`]}`} title="Цвет в расписании" /><h2>{item.name}</h2><button className={`${s.switch} ${item.isActive ? s.on : ''}`} onClick={() => toggle(item)}><span /></button><small>{item.isActive ? 'Вкл' : 'Выкл'}</small></div>
                            <p>{item.description || 'Описание пока не добавлено.'}</p>
                            {item.content && <p>{item.content}</p>}
                            {item.youtubeUrl && <a href={item.youtubeUrl} target="_blank" rel="noreferrer">{t('YouTube')}</a>}
                            <div className={s.actions}>
                                {item.youtubeUrl && <a className={s.iconBtn} href={item.youtubeUrl} target="_blank" rel="noreferrer">↗</a>}
                                <button className={s.iconBtn} onClick={() => openEdit(item)}>{t('✎')}</button>
                                <button className={`${s.iconBtn} ${s.delete}`} onClick={() => remove(item)}>{t('⌫')}</button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <DanceStyleFormModal
                isOpen={modalOpen}
                isEditing={editingId !== undefined}
                lang={lang}
                form={form}
                saving={saving}
                onClose={() => setModalOpen(false)}
                onLangChange={setLang}
                onFieldChange={updateField}
                onUploadImage={uploadImage}
                onSave={save}
            />
        </Page>
    );
});

export default DanceStylesPage;

import { memo, type ChangeEvent, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { toAbsUrl } from './useChoreographerModal';
import s from './ChoreographerModal.module.scss';

interface ChoreographerPhotoSectionProps {
    photo: string | null;
    mainPhoto: string | null;
    additionalPhotos: string[];
    uploadingPhoto: boolean;
    uploadingMain: boolean;
    uploadingExtra: boolean;
    firstNameRu: string;
    lastNameRu: string;
    avatarInputRef: RefObject<HTMLInputElement | null>;
    mainInputRef: RefObject<HTMLInputElement | null>;
    extraInputRef: RefObject<HTMLInputElement | null>;
    onAvatarChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onMainChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onExtraChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onRemoveMain: () => void;
    onRemoveExtra: (index: number) => void;
}

export const ChoreographerPhotoSection = memo((props: ChoreographerPhotoSectionProps) => {
    const { t } = useTranslation();
    const {
        photo, mainPhoto, additionalPhotos,
        uploadingPhoto, uploadingMain, uploadingExtra,
        firstNameRu, lastNameRu,
        avatarInputRef, mainInputRef, extraInputRef,
        onAvatarChange, onMainChange, onExtraChange,
        onRemoveMain, onRemoveExtra,
    } = props;

    return (
        <>
            {/* Avatar */}
            <div className={s.avatarSection}>
                <div className={s.avatarWrap}>
                    {photo
                        ? <img className={s.avatar} src={toAbsUrl(photo)!} alt="avatar" />
                        : <div className={s.avatarPlaceholder}>{firstNameRu?.[0] ?? '?'}{lastNameRu?.[0] ?? ''}</div>
                    }
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" className={s.fileInput} onChange={onAvatarChange} />
                <button type="button" className={s.uploadBtn} onClick={() => avatarInputRef.current?.click()} disabled={uploadingPhoto}>
                    {uploadingPhoto ? 'Загрузка...' : 'Изменить фото'}
                </button>
                <div className={s.uploadHint}>{t('JPG, PNG, WEBP — до 5 МБ')}</div>
            </div>

            {/* Main photo */}
            <div className={s.mainPhotoSection}>
                <label className={s.label}>{t('Основное фото для сайта')}</label>
                {mainPhoto && (
                    <div className={s.mainPhotoWrap}>
                        <img className={s.mainPhoto} src={toAbsUrl(mainPhoto)!} alt="main" />
                        <button type="button" className={s.removePhotoBtn} onClick={onRemoveMain}>{t('Удалить')}</button>
                    </div>
                )}
                <input ref={mainInputRef} type="file" accept="image/*" className={s.fileInput} onChange={onMainChange} />
                <button type="button" className={s.uploadBtn} onClick={() => mainInputRef.current?.click()} disabled={uploadingMain}>
                    {uploadingMain ? 'Загрузка...' : 'Изменить основное фото'}
                </button>
            </div>

            {/* Additional photos */}
            <div className={s.extraSection}>
                <label className={s.label}>{t('Дополнительные фото (до 5)')}</label>
                <div className={s.extraGrid}>
                    {additionalPhotos.map((url, idx) => (
                        <div key={idx} className={s.extraItem}>
                            <img className={s.extraImg} src={toAbsUrl(url)!} alt={`extra-${idx}`} />
                            <button type="button" className={s.removeExtraBtn} onClick={() => onRemoveExtra(idx)}>×</button>
                        </div>
                    ))}
                    {additionalPhotos.length < 5 && (
                        <>
                            <input ref={extraInputRef} type="file" accept="image/*" className={s.fileInput} onChange={onExtraChange} />
                            <button type="button" className={s.addExtraBtn} onClick={() => extraInputRef.current?.click()} disabled={uploadingExtra}>
                                {uploadingExtra ? '...' : '+ Добавить фото'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
});

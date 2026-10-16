import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { Input } from '@/shared/ui/Input/Input';
import {
    MANDATE_DOCUMENT_ACCEPT,
    MandateDocument,
    MandateDocumentUpload,
    formatDocumentSize,
} from './mandateDocumentsApi';
import s from './MandateDocumentsPanel.module.scss';

interface MandateDocumentsPanelProps {
    mandateId: string;
    documents: MandateDocument[];
    isBusy: boolean;
    onUpload: (upload: Omit<MandateDocumentUpload, 'customerId'>) => Promise<boolean>;
    onDownload: (document: MandateDocument) => void;
    onDelete: (document: MandateDocument) => void;
}

interface MandateDocumentRowProps {
    document: MandateDocument;
    onDownload: (document: MandateDocument) => void;
    onDelete: (document: MandateDocument) => void;
}

const MandateDocumentRow = ({ document, onDownload, onDelete }: MandateDocumentRowProps) => {
    const { t } = useTranslation();
    const uploadedAt = new Date(document.createdAt).toLocaleDateString('nl-NL');
    return (
        <li className={s.documentRow}>
            <div className={s.documentInfo}>
                <span className={s.documentName}>{document.originalName}</span>
                {document.caption && <span className={s.caption}>{document.caption}</span>}
                <span className={s.meta}>{`${formatDocumentSize(document.sizeBytes)} · ${uploadedAt}`}</span>
            </div>
            <div className={s.documentActions}>
                <Button theme={ButtonTheme.OUTLINE} onClick={() => onDownload(document)}>{t('Скачать')}</Button>
                <Button theme={ButtonTheme.OUTLINE_RED} onClick={() => onDelete(document)}>{t('Удалить')}</Button>
            </div>
        </li>
    );
};

type UploadFormProps = Pick<MandateDocumentsPanelProps, 'mandateId' | 'isBusy' | 'onUpload'>;

const MandateDocumentUploadForm = ({ mandateId, isBusy, onUpload }: UploadFormProps) => {
    const { t } = useTranslation();
    const [file, setFile] = useState<File | null>(null);
    const [caption, setCaption] = useState('');
    const [resetKey, setResetKey] = useState(0);

    const onSubmit = async () => {
        if (!file) return;
        if (await onUpload({ mandateId, file, caption })) {
            setFile(null);
            setCaption('');
            setResetKey((key) => key + 1);
        }
    };

    return (
        <div className={s.uploadForm}>
            <Input
                key={resetKey}
                type="file"
                accept={MANDATE_DOCUMENT_ACCEPT}
                aria-label={t('Файл подписанного мандата')}
                onChange={(value) => setFile(Array.isArray(value) ? value[0] : value)}
            />
            <Input
                fullWidth
                value={caption}
                maxLength={500}
                placeholder={t('Подпись (необязательно)')}
                onChange={setCaption}
            />
            <Button theme={ButtonTheme.BACKGROUND_INVERTED} disabled={!file || isBusy} onClick={onSubmit}>
                {isBusy ? t('Загрузка...') : t('Загрузить')}
            </Button>
        </div>
    );
};

export const MandateDocumentsPanel = memo((props: MandateDocumentsPanelProps) => {
    const { mandateId, documents, isBusy, onUpload, onDownload, onDelete } = props;
    const { t } = useTranslation();
    return (
        <div className={s.MandateDocumentsPanel}>
            <span className={s.title}>{t('Подписанный мандат')}</span>
            {documents.length > 0 ? (
                <ul className={s.documentList}>
                    {documents.map((document) => (
                        <MandateDocumentRow key={document.id} document={document} onDownload={onDownload} onDelete={onDelete} />
                    ))}
                </ul>
            ) : (
                <span className={s.meta}>{t('Файл ещё не загружен')}</span>
            )}
            <MandateDocumentUploadForm mandateId={mandateId} isBusy={isBusy} onUpload={onUpload} />
        </div>
    );
});

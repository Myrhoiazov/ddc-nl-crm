import { memo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Text } from '@/shared/ui/Text/Text';
import { HStack, VStack } from '@/shared/ui/Stack';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './EmailComposer.module.scss';

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

export interface EmailComposerSendPayload {
    html: string;
    files: File[];
}

interface EmailComposerProps {
    onSend: (payload: EmailComposerSendPayload) => Promise<boolean>;
    isSending?: boolean;
    sendLabel?: string;
    placeholder?: string;
}

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

export const EmailComposer = memo((props: EmailComposerProps) => {
    const { onSend, isSending, sendLabel, placeholder } = props;
    const { t } = useTranslation();
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState<string>();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({ openOnClick: false, autolink: true }),
            Placeholder.configure({ placeholder: placeholder ?? 'Напишите сообщение...' }),
        ],
        // Tiptap v3 no longer re-renders the host component on every transaction by
        // default (unlike v2) — without this, `editor.isEmpty` below and the toolbar's
        // `isActive(...)` checks freeze at their mount-time value, so the Send button
        // stays permanently disabled the moment you start typing.
        shouldRerenderOnTransaction: true,
    });

    const onPickFiles = () => {
        fileInputRef.current?.click();
    };

    const onFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(event.target.files ?? []);
        event.target.value = '';
        setError(undefined);

        const oversized = selected.find((file) => file.size > MAX_ATTACHMENT_SIZE);
        if (oversized) {
            setError(`Файл "${oversized.name}" больше 10 МБ`);
            return;
        }

        setFiles((prev) => {
            const next = [...prev, ...selected];
            if (next.length > MAX_ATTACHMENTS) {
                setError(`Можно приложить не более ${MAX_ATTACHMENTS} файлов`);
                return prev;
            }
            return next;
        });
    };

    const onRemoveFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const onSetLink = () => {
        const previousUrl = editor?.getAttributes('link').href as string | undefined;
        const url = window.prompt('Ссылка (URL):', previousUrl ?? 'https://');

        if (url === null) {
            return;
        }

        if (!url) {
            editor?.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const isEmpty = !editor || editor.isEmpty;

    const onSubmit = async () => {
        if (!editor || isEmpty) {
            return;
        }

        setError(undefined);
        const ok = await onSend({ html: editor.getHTML(), files });

        if (ok) {
            editor.commands.clearContent();
            setFiles([]);
        } else {
            setError('Не удалось отправить письмо');
        }
    };

    return (
        <VStack gap="8" max align="stretch" className={cls.composer}>
            <div className={cls.toolbar}>
                <button
                    type="button"
                    className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: editor?.isActive('bold') })}
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    aria-label={t('Жирный')}
                >
                    <b>B</b>
                </button>
                <button
                    type="button"
                    className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: editor?.isActive('italic') })}
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    aria-label={t('Курсив')}
                >
                    <i>I</i>
                </button>
                <button
                    type="button"
                    className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: editor?.isActive('bulletList') })}
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    aria-label={t('Маркированный список')}
                >
                    •≡
                </button>
                <button
                    type="button"
                    className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: editor?.isActive('orderedList') })}
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    aria-label={t('Нумерованный список')}
                >
                    {t('1≡')}
                </button>
                <button
                    type="button"
                    className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: editor?.isActive('link') })}
                    onClick={onSetLink}
                    aria-label={t('Ссылка')}
                >
                    🔗
                </button>
            </div>

            <EditorContent editor={editor} className={cls.editor} />

            {files.length > 0 && (
                <HStack gap="8" wrap="wrap">
                    {files.map((file, index) => (
                        <span key={`${file.name}-${index}`} className={cls.fileChip}>
                            <span className={cls.fileName}>{file.name}</span>
                            <span className={cls.fileSize}>{formatFileSize(file.size)}</span>
                            <button
                                type="button"
                                className={cls.fileRemove}
                                onClick={() => onRemoveFile(index)}
                                aria-label={t('Убрать файл')}
                            >
                                {t('✕')}
                            </button>
                        </span>
                    ))}
                </HStack>
            )}

            {error && <Text text={error} variant="error" size="s" />}

            <HStack justify="between" align="center" max>
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className={cls.hiddenInput}
                        onChange={onFilesSelected}
                    />
                    <Button
                        theme={ButtonTheme.OUTLINE}
                        onClick={onPickFiles}
                        disabled={files.length >= MAX_ATTACHMENTS}
                    >
                        📎 {t('Прикрепить файл')}
                    </Button>
                </div>
                <Button
                    theme={ButtonTheme.BACKGROUND_INVERTED}
                    disabled={isSending || isEmpty}
                    onClick={onSubmit}
                >
                    {isSending ? t('Отправка...') : (sendLabel ?? t('Отправить'))}
                </Button>
            </HStack>
        </VStack>
    );
});

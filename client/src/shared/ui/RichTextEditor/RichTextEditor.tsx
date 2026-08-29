import { memo, useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './RichTextEditor.module.scss';

interface RichTextEditorProps {
    className?: string;
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    readonly?: boolean;
}

export const RichTextEditor = memo((props: RichTextEditorProps) => {
    const { className, value, onChange, placeholder, readonly } = props;

    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({ openOnClick: false, autolink: true }),
            Placeholder.configure({ placeholder: placeholder ?? '' }),
        ],
        content: value,
        editable: !readonly,
        shouldRerenderOnTransaction: true,
        onUpdate: ({ editor: updatedEditor }) => {
            onChange(updatedEditor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value, { emitUpdate: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, editor]);

    useEffect(() => {
        editor?.setEditable(!readonly);
    }, [editor, readonly]);

    const onSetLink = () => {
        const previousUrl = editor?.getAttributes('link').href as string | undefined;
        const url = window.prompt('Ссылка (URL):', previousUrl ?? 'https://');

        if (url === null) return;

        if (!url) {
            editor?.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <div className={classNames(cls.wrapper, {}, [className])}>
            <div className={cls.toolbar}>
                <button
                    type="button"
                    className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: !!editor?.isActive('bold') })}
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    aria-label="Жирный"
                >
                    <b>B</b>
                </button>
                <button
                    type="button"
                    className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: !!editor?.isActive('italic') })}
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    aria-label="Курсив"
                >
                    <i>I</i>
                </button>
                <button
                    type="button"
                    className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: !!editor?.isActive('bulletList') })}
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    aria-label="Маркированный список"
                >
                    •≡
                </button>
                <button
                    type="button"
                    className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: !!editor?.isActive('orderedList') })}
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    aria-label="Нумерованный список"
                >
                    1≡
                </button>
                <button
                    type="button"
                    className={classNames(cls.toolbarBtn, { [cls.toolbarBtnActive]: !!editor?.isActive('link') })}
                    onClick={onSetLink}
                    aria-label="Ссылка"
                >
                    🔗
                </button>
            </div>
            <EditorContent editor={editor} className={cls.editor} />
        </div>
    );
});

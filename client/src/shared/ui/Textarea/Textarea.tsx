import { classNames, Mods } from '@/shared/lib/classNames/classNames';
import React, { memo, TextareaHTMLAttributes, useEffect, useRef, useState } from 'react';
import cls from './Textarea.module.scss';

type HTMLTextAreaProps = Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    'value' | 'onChange' | 'readOnly' | 'size'
>;

type TextAreaSize = 's' | 'm' | 'l';

interface TextareaProps extends HTMLTextAreaProps {
    className?: string;
    value?: string;
    label?: string;
    onChange?: (value: string) => void;
    autofocus?: boolean;
    readonly?: boolean;
    size?: TextAreaSize;
    fullWidth?: boolean;
}

const Textarea = memo((props: TextareaProps) => {
    const {
        className,
        readonly,
        value,
        fullWidth,
        onChange,
        name,
        placeholder,
        autofocus,
        ...otherProps
    } = props;

    const ref = useRef<HTMLTextAreaElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (autofocus) {
            setIsFocused(true);
            ref.current?.focus();
        }
    }, [autofocus]);

    const onChangeHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e.target.value);
    };

    const onBlur = () => {
        setIsFocused(false);
    };

    const onFocus = () => {
        setIsFocused(true);
    };

    const mods: Mods = {
        [cls.readonly]: readonly,
        [cls.focused]: isFocused,
        [cls.fullWidth]: fullWidth,
    };

    return (
        <div className={classNames(cls.Textarea, mods, [className])}>
            {placeholder && (
                <label htmlFor={placeholder} className={cls.placeholder}>{`${placeholder}`}</label>
            )}
            <textarea
                name={name}
                id={placeholder}
                ref={ref}
                value={value}
                onChange={onChangeHandler}
                className={cls.input}
                onFocus={onFocus}
                onBlur={onBlur}
                {...otherProps}
            />
        </div>
    );
});

export default memo(Textarea);

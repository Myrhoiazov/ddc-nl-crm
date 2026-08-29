import React, { InputHTMLAttributes, memo, ReactNode, useEffect, useRef, useState } from 'react';
import cls from './Input.module.scss';
import { classNames, Mods } from '@/shared/lib/classNames/classNames';
import { VStack } from '../Stack';
import { Text } from '../Text/Text';

type HTMLInputProps = Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'readOnly' | 'size'
>;

type InputSize = 's' | 'm' | 'l';

type BaseInputProps = {
    className?: string;
    label?: string;
    autofocus?: boolean;
    readonly?: boolean;
    addonLeft?: ReactNode;
    addonRight?: ReactNode;
    size?: InputSize;
    fullWidth?: boolean;
} & HTMLInputProps;

type TextInputProps = BaseInputProps & {
    type?: 'text' | 'email' | 'date' | 'number' | 'tel' | 'password';
    value?: string | number;
    onChange?: (value: string) => void;
};

type FileInputProps = BaseInputProps & {
    type: 'file';
    value?: never;
    onChange?: (value: File | File[]) => void;
};

export type InputProps = TextInputProps | FileInputProps;

export const Input = memo((props: InputProps) => {
    const {
        className,
        value,
        onChange,
        type = 'text',
        placeholder,
        autofocus,
        readonly,
        fullWidth,
        addonLeft,
        addonRight,
        label,
        size = 'm',
        ...otherProps
    } = props;
    const ref = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (autofocus) {
            setIsFocused(true);
            ref.current?.focus();
        }
    }, [autofocus]);

    const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (type === 'file') {
            const files = e.target.files;
            if (files?.length === 1) {
                (onChange as (value: File) => void)?.(files[0]);
            } else if (files?.length && files.length > 1) {
                (onChange as (value: File[]) => void)?.(Array.from(files));
            }
        } else {
            (onChange as (value: string | number) => void)?.(e.target.value);
        }
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
        [cls.withAddonLeft]: Boolean(addonLeft),
        [cls.withAddonRight]: Boolean(addonRight),
    };

    const input = (
        <div className={classNames(cls.InputWrapper, mods, [className, cls[size]])}>
            <div className={cls.addonLeft}>{addonLeft}</div>
            <input
                ref={ref}
                type={type}
                value={value}
                onChange={onChangeHandler}
                className={cls.input}
                onFocus={onFocus}
                onBlur={onBlur}
                readOnly={readonly}
                placeholder={placeholder}
                {...otherProps}
            />
            <div className={cls.addonRight}>{addonRight}</div>
        </div>
    );

    if (label) {
        return (
            <VStack max gap="4">
                <Text text={label} />
                {input}
            </VStack>
        );
    }

    return input;
});

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './LangSwitcher.module.scss';

interface LangSwitcherProps {
    className?: string;
    short?: boolean;
}

export const LangSwitcher = memo(({ className, short }: LangSwitcherProps) => {
    const { t, i18n } = useTranslation();

    const toggle = async () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'ru' : 'en');
    };

    return (
        <Button
            className={classNames(s.LangSwitcher, {}, [className])}
            theme={ButtonTheme.CLEAR}
            onClick={toggle}
        >
            {t(short ? 'lang' : 'language')}
        </Button>
    );
});

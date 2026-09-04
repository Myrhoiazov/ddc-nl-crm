import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { Input } from '@/shared/ui/Input/Input';
import { Select } from '@/shared/ui/Select/Select';
import { CLIENT_LANGUAGE_OPTIONS, ClientLanguage } from '@/entities/Client';
import { MollieClient } from '../../model/types/mollieClient';

interface MollieClientCardContactFieldsProps {
    data?: MollieClient;
    onChangeCity?: (value?: string) => void;
    onChangeEmail?: (value?: string) => void;
    onChangePreferredLanguage?: (value?: ClientLanguage) => void;
    readonly?: boolean;
}

export const MollieClientCardContactFields = memo((props: MollieClientCardContactFieldsProps) => {
    const { data, onChangeCity, onChangeEmail, onChangePreferredLanguage, readonly } = props;
    const { t } = useTranslation();

    return (
        <>
            <Input
                fullWidth
                label="City"
                type="text"
                placeholder={t('Deventer')}
                onChange={onChangeCity}
                value={data?.city || ''}
            />
            <Input
                fullWidth
                label="E-mail"
                type="text"
                placeholder={t('example@gmail.com')}
                onChange={onChangeEmail}
                value={data?.email || ''}
            />
            <Select<ClientLanguage>
                label="Язык письма-напоминания (кому платит Mollie)"
                options={CLIENT_LANGUAGE_OPTIONS}
                value={data?.preferredLanguage ?? 'RU'}
                onChange={onChangePreferredLanguage}
                readonly={readonly}
            />
        </>
    );
});
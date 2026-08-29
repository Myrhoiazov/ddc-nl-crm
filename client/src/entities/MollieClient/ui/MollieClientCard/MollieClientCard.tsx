import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { Input } from '@/shared/ui/Input/Input';
import { Select } from '@/shared/ui/Select/Select';
import { CLIENT_LANGUAGE_OPTIONS, ClientLanguage } from '@/entities/Client';
import { MollieClient } from '../../model/types/mollieClient';

export interface MollieClientCardProps {
    className?: string;
    data?: MollieClient;
    error?: string;
    isLoading?: boolean;
    readonly?: boolean;
    onChangeLastName?: (value?: string) => void;
    onChangeFirstName?: (value?: string) => void;
    onChangeCity?: (value?: string) => void;
    onChangeEmail?: (value?: string) => void;
    onChangeConsumerAccount?: (value?: string) => void;
    onChangeConsumerBic?: (value?: string) => void;
    onChangeConsumerName?: (value?: string) => void;
    onChangePreferredLanguage?: (value?: ClientLanguage) => void;
}

export const MollieClientCard = memo((props: MollieClientCardProps) => {
    const {
        className,
        data,
        readonly,
        onChangeFirstName,
        onChangeLastName,
        onChangeEmail,
        onChangeCity,
        onChangeConsumerAccount,
        onChangeConsumerBic,
        onChangeConsumerName,
        onChangePreferredLanguage,
    } = props;
    const { t } = useTranslation();

    return (
        <>
            <Input
                fullWidth
                label="MollieId"
                type="text"
                readonly={true}
                placeholder={t('cst_bhiubi')}
                name={data?.mollieId}
                value={data?.mollieId || ''}
            />
            <Input
                fullWidth
                label="Имя"
                autofocus
                type="text"
                placeholder={t('Имя')}
                onChange={onChangeFirstName}
                name={data?.givenName}
                value={data?.givenName || ''}
            />
            <Input
                fullWidth
                label="Фамилия"
                type="text"
                placeholder={t('Фамилия')}
                onChange={onChangeLastName}
                value={data?.familyName || ''}
            />
            <Input
                fullWidth
                label="Consumer Name"
                type="text"
                placeholder={t('Consumer Name')}
                onChange={onChangeConsumerName}
                value={data?.consumerName || ''}
            />
            <Input
                fullWidth
                label="Consumer Account"
                type="text"
                placeholder={t('Consumer Account')}
                onChange={onChangeConsumerAccount}
                value={data?.consumerAccount || ''}
            />
            <Input
                fullWidth
                label="Consumer Bic"
                type="text"
                placeholder={t('Consumer Bic')}
                onChange={onChangeConsumerBic}
                value={data?.consumerBic || ''}
            />

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

export default MollieClientCard;

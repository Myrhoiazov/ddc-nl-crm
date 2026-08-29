import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { Input } from '@/shared/ui/Input/Input';
import { Client, ClientLanguage, CLIENT_LANGUAGE_OPTIONS } from '@/entities/Client';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import s from './ClientCard.module.scss';

export interface ClientCardProps {
    className?: string;
    data?: Client;
    error?: string;
    isLoading?: boolean;
    readonly?: boolean;
    onChangeLastName?: (value?: string) => void;
    onChangeFirstName?: (value?: string) => void;
    onChangeCity?: (value?: string) => void;
    onChangeEmail?: (value?: string) => void;
    onChangeBirthday?: (value?: string) => void;
    onChangePhoneNumber?: (value?: string) => void;
    onChangeSocial?: (value?: string) => void;
    onChangeBranchId?: (value?: string) => void;
    onChangePreferredLanguage?: (value?: ClientLanguage) => void;
    onChangeImage?: (value?: File) => void;
    branchOptions?: SelectOption<string>[];
}

export const ClientCard = memo((props: ClientCardProps) => {
    const {
        className,
        data,
        readonly,
        onChangeFirstName,
        onChangeLastName,
        onChangeBirthday,
        onChangeEmail,
        onChangeImage,
        onChangePhoneNumber,
        onChangeSocial,
        onChangeBranchId,
        onChangePreferredLanguage,
        branchOptions = [],
    } = props;
    const { t } = useTranslation();

    return (
        <div className={classNames(s.ClientCard, {}, [className])}>
            <div className={s.grid}>
                <Input
                    fullWidth
                    label="Имя"
                    autofocus
                    type="text"
                    placeholder={t('Имя')}
                    onChange={onChangeFirstName}
                    value={data?.firstName ?? ''}
                />
                <Input
                    fullWidth
                    label="Фамилия"
                    type="text"
                    placeholder={t('Фамилия')}
                    onChange={onChangeLastName}
                    value={data?.lastName}
                />
                <Input
                    fullWidth
                    label="Дата рождения"
                    type="date"
                    onChange={onChangeBirthday}
                    value={data?.birthday ?? ''}
                />
                <Input
                    fullWidth
                    label="Телефон"
                    type="tel"
                    placeholder={t('097-123-45-67')}
                    onChange={onChangePhoneNumber}
                    value={data?.phoneNumber ?? ''}
                />
                <Input
                    fullWidth
                    label="E-mail (необязательно)"
                    type="email"
                    placeholder={t('example@gmail.com')}
                    onChange={onChangeEmail}
                    value={data?.email ?? ''}
                />
                <Input
                    fullWidth
                    label="Социальные сети"
                    type="text"
                    placeholder={t('Instagram, WhatsApp или другая ссылка')}
                    onChange={onChangeSocial}
                    value={data?.social ?? ''}
                />
                <Select
                    label="Филиал"
                    options={branchOptions}
                    value={data?.branchId ? String(data.branchId) : ''}
                    onChange={onChangeBranchId}
                />
                <Select<ClientLanguage>
                    label="Язык клиента"
                    options={CLIENT_LANGUAGE_OPTIONS}
                    value={data?.preferredLanguage ?? 'RU'}
                    onChange={onChangePreferredLanguage}
                />
                <Input
                    fullWidth
                    label="Фото ученика"
                    type="file"
                    placeholder={t('Загрузите фото')}
                    onChange={(file) => {
                        onChangeImage?.(file as File);
                    }}
                />
            </div>
        </div>
    );
});

export default ClientCard;

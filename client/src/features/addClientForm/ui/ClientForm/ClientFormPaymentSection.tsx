import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/Text/Text';
import { Input } from '@/shared/ui/Input/Input';
import { Select } from '@/shared/ui/Select/Select';
import { PayerRelation, payerRelationOptions } from './useClientForm';
import { useMollieCustomerSearch } from './useMollieCustomerSearch';
import cls from './ClientForm.module.scss';

interface ClientFormPaymentSectionProps {
    mollieCustomerId: string;
    setMollieCustomerId: (value: string) => void;
    payerRelation: PayerRelation;
    setPayerRelation: (value: PayerRelation) => void;
}

export const ClientFormPaymentSection = memo((props: ClientFormPaymentSectionProps) => {
    const { mollieCustomerId, setMollieCustomerId, payerRelation, setPayerRelation } = props;
    const { t } = useTranslation();
    const {
        search, onChangeSearch, options, onSelectCustomer, isEmpty,
    } = useMollieCustomerSearch(mollieCustomerId, setMollieCustomerId);

    return (
        <div className={cls.paymentSection}>
            <Text size="s" title={t('Платёжный аккаунт')} bold />
            <Text size="s" text={t('Необязательно. Можно связать существующего плательщика с новым учеником.')} />
            <Input
                label={t('Поиск платёжного аккаунта')}
                placeholder={t('Имя, фамилия или email')}
                value={search}
                onChange={onChangeSearch}
            />
            {isEmpty && <Text size="s" text={t('Платёжные аккаунты не найдены.')} />}
            <div className={cls.paymentGrid}>
                <Select
                    label="Mollie payment account"
                    options={options}
                    value={mollieCustomerId}
                    onChange={onSelectCustomer}
                />
                {mollieCustomerId && (
                    <Select<PayerRelation>
                        label="Роль плательщика"
                        options={payerRelationOptions}
                        value={payerRelation}
                        onChange={setPayerRelation}
                    />
                )}
            </div>
        </div>
    );
});

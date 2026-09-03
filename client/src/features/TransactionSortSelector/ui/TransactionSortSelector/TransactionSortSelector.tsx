import { memo, useMemo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './TransactionSortSelector.module.scss';
import { SortOrder } from '@/shared/types/sort';
import { useTranslation } from 'react-i18next';
import { SelectOption } from '@/shared/ui/Select/Select';
import { HStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { ListBox } from '@/shared/ui/Popups';
import { TransactionSortField } from '@/entities/Transaction';
import { Month } from '@/entities/Month';

interface TransactionSortSelectorProps {
    className?: string;
    sort: TransactionSortField;
    order: SortOrder;
    month: Month;
    onChangeOrder: (newOrder: SortOrder) => void;
    onChangeSort: (newSort: TransactionSortField) => void;
    onChangeMonth: (month: Month) => void;
}

export const TransactionSortSelector = memo((props: TransactionSortSelectorProps) => {
    const { className, onChangeOrder, onChangeMonth, onChangeSort, order, sort, month } = props;
    const { t } = useTranslation();

    const orderOptions = useMemo<SelectOption<SortOrder>[]>(
        () => [
            {
                value: '',
                content: t('Выбрать значение'),
            },
            {
                value: 'asc',
                content: t('возрастанию'),
            },
            {
                value: 'desc',
                content: t('убыванию'),
            },
        ],
        [t]
    );

    const sortFieldOptions = useMemo<SelectOption<TransactionSortField>[]>(
        () => [
            {
                value: TransactionSortField.ID,
                content: t('По номерации'),
            },
            {
                value: TransactionSortField.DATE,
                content: t('дате создания'),
            },
            {
                value: TransactionSortField.CATEGORY,
                content: t('по категории'),
            },
        ],
        [t]
    );

    const sortMonthOptions = useMemo<SelectOption<Month>[]>(
        () => [
            {
                value: Month.ALL,
                content: t('Все месяцы'),
            },
            {
                value: Month.JANUARY,
                content: t('Январь'),
            },
            {
                value: Month.FEBRUARY,
                content: t('Февраль'),
            },
            {
                value: Month.MARCH,
                content: t('Март'),
            },
            {
                value: Month.APRIL,
                content: t('Апрель'),
            },
            {
                value: Month.MAY,
                content: t('Май'),
            },
            {
                value: Month.JUNE,
                content: t('Июнь'),
            },
            {
                value: Month.JULY,
                content: t('Июль'),
            },
            {
                value: Month.AUGUST,
                content: t('Август'),
            },
            {
                value: Month.SEPTEMBER,
                content: t('Сентябрь'),
            },
            {
                value: Month.OCTOBER,
                content: t('Октябрь'),
            },
            {
                value: Month.NOVEMBER,
                content: t('Ноябрь'),
            },
            {
                value: Month.DECEMBER,
                content: t('Декабрь'),
            },
        ],
        [t]
    );

    return (
        <div className={classNames(s.TransactionSortSelector, {}, [className])}>
            <HStack gap="8" max>
                <Text text={t('Сортировать по:')} />
                <ListBox items={sortFieldOptions} value={sort} onChange={onChangeSort} />
                <ListBox items={orderOptions} value={order} onChange={onChangeOrder} />
                <ListBox items={sortMonthOptions} value={month} onChange={onChangeMonth} />
            </HStack>
        </div>
    );
});

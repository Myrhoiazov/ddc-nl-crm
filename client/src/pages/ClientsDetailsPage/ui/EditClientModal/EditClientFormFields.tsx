import { memo } from 'react';
import { Client, ClientLanguage, CLIENT_LANGUAGE_OPTIONS } from '@/entities/Client';
import { Input } from '@/shared/ui/Input/Input';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { Text } from '@/shared/ui/Text/Text';
import { DanceGroup } from './useEditClientModal';
import s from './EditClientModal.module.scss';

interface EditClientFormFieldsProps {
    form: Client;
    errors: Record<string, string>;
    branchOptions: SelectOption<string>[];
    availableGroups: DanceGroup[];
    selectedGroupIds: number[];
    updateField: (field: keyof Client) => (value?: string) => void;
    updateBranch: (value?: string) => void;
    toggleGroup: (groupId: number) => void;
    onChangeImage: (value: File | File[]) => void;
}

export const EditClientFormFields = memo((props: EditClientFormFieldsProps) => {
    const {
        form, errors, branchOptions, availableGroups, selectedGroupIds,
        updateField, updateBranch, toggleGroup, onChangeImage,
    } = props;

    return (
        <>
            <div className={s.grid}>
                <div className={s.field}>
                    <Input fullWidth label="Имя" type="text" value={form.firstName ?? ''} onChange={updateField('firstName')} />
                    {errors.firstName && <span className={s.fieldError}>{errors.firstName}</span>}
                </div>
                <div className={s.field}>
                    <Input fullWidth label="Фамилия" type="text" value={form.lastName ?? ''} onChange={updateField('lastName')} />
                    {errors.lastName && <span className={s.fieldError}>{errors.lastName}</span>}
                </div>
                <div className={s.field}>
                    <Input fullWidth label="Дата рождения" type="date" value={form.birthday ?? ''} onChange={updateField('birthday')} />
                    {errors.birthday && <span className={s.fieldError}>{errors.birthday}</span>}
                </div>
                <div className={s.field}>
                    <Input fullWidth label="Телефон" type="tel" value={form.phoneNumber ?? ''} onChange={updateField('phoneNumber')} />
                    {errors.phoneNumber && <span className={s.fieldError}>{errors.phoneNumber}</span>}
                </div>
                <div className={s.field}>
                    <Input fullWidth label="E-mail" type="email" value={form.email ?? ''} onChange={updateField('email')} />
                    {errors.email && <span className={s.fieldError}>{errors.email}</span>}
                </div>
                <div className={s.field}>
                    <Input fullWidth label="Социальные сети" type="text" value={form.social ?? ''} onChange={updateField('social')} />
                    {errors.social && <span className={s.fieldError}>{errors.social}</span>}
                </div>
                <div className={s.field}>
                    <Select label="Филиал" options={branchOptions} value={form.branchId ? String(form.branchId) : ''} onChange={updateBranch} />
                    {errors.branchId && <span className={s.fieldError}>{errors.branchId}</span>}
                </div>
                <div className={s.field}>
                    <Select<ClientLanguage>
                        label="Язык клиента"
                        options={CLIENT_LANGUAGE_OPTIONS}
                        value={form.preferredLanguage ?? 'RU'}
                        onChange={updateField('preferredLanguage')}
                    />
                    {errors.preferredLanguage && <span className={s.fieldError}>{errors.preferredLanguage}</span>}
                </div>
                <div className={s.field}>
                    <Input fullWidth label="Фото ученика" type="file" onChange={onChangeImage} />
                    {errors.image && <span className={s.fieldError}>{errors.image}</span>}
                </div>
            </div>
            {form.branchId && (
                <div className={s.groupSection}>
                    <Text size="s" title="Группы филиала" bold />
                    {availableGroups.length ? (
                        <div className={s.groupOptions}>
                            {availableGroups.map((group) => (
                                <label key={group.id} className={s.groupOption}>
                                    <input
                                        type="checkbox"
                                        checked={selectedGroupIds.includes(group.id)}
                                        onChange={() => toggleGroup(group.id)}
                                    />
                                    <span><strong>{group.name}</strong><small>{group.style} · {group.level}</small></span>
                                </label>
                            ))}
                        </div>
                    ) : <Text size="s" text="В выбранном филиале пока нет доступных групп." />}
                </div>
            )}
        </>
    );
});

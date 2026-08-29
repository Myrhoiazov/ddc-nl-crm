import { memo, useState, useEffect } from 'react';
import { Modal } from '@/shared/ui/Modal/Modal';
import { $apiPrivate } from '@/shared/api/api';
import { toast } from 'react-toastify';
import { Branch } from '../BranchCard/BranchCard';
import s from './BranchModal.module.scss';

interface BranchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editBranch?: Branch | null;
}

export const BranchModal = memo(({ isOpen, onClose, onSaved, editBranch }: BranchModalProps) => {
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editBranch) {
            setName(editBranch.name);
            setCity(editBranch.city ?? '');
            setAddress(editBranch.address ?? '');
            setPhone(editBranch.phone ?? '');
            setEmail(editBranch.email ?? '');
            setDescription(editBranch.description ?? '');
            setIsActive(editBranch.isActive);
        } else {
            setName(''); setCity(''); setAddress('');
            setPhone(''); setEmail(''); setDescription(''); setIsActive(true);
        }
    }, [editBranch, isOpen]);

    const onSubmit = async () => {
        if (!name) { toast.error('Введите название филиала'); return; }
        setSaving(true);
        try {
            const payload = { name, city, address, phone, email, description, isActive };
            if (editBranch) {
                await $apiPrivate.put(`/company/branches/${editBranch.id}`, payload);
                toast.success('Филиал обновлён');
            } else {
                await $apiPrivate.post('/company/branches', payload);
                toast.success('Филиал создан');
            }
            onSaved();
            onClose();
        } catch {
            toast.error('Не удалось сохранить филиал');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <div className={s.modal}>
                <h2 className={s.title}>{editBranch ? 'РЕДАКТИРОВАТЬ ФИЛИАЛ' : 'СОЗДАТЬ ФИЛИАЛ'}</h2>

                <div className={s.form}>
                    <div className={s.field}>
                        <label className={s.label}>Название <span className={s.req}>*</span></label>
                        <input className={s.input} placeholder="DDC Центральный" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    <div className={s.row}>
                        <div className={s.field}>
                            <label className={s.label}>Город</label>
                            <input className={s.input} placeholder="Киев" value={city} onChange={(e) => setCity(e.target.value)} />
                        </div>
                        <div className={s.field}>
                            <label className={s.label}>Адрес</label>
                            <input className={s.input} placeholder="ул. Хрещатик, 1" value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>
                    </div>

                    <div className={s.row}>
                        <div className={s.field}>
                            <label className={s.label}>Телефон</label>
                            <input className={s.input} placeholder="+38 (050) 000-00-00" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div className={s.field}>
                            <label className={s.label}>Email</label>
                            <input className={s.input} placeholder="branch@ddc.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                    </div>

                    <div className={s.field}>
                        <label className={s.label}>Описание</label>
                        <textarea
                            className={s.textarea}
                            placeholder="Основной филиал в центре города..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className={s.field}>
                        <label className={s.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className={s.checkbox}
                            />
                            Филиал активен
                        </label>
                    </div>
                </div>

                <button className={s.submitBtn} onClick={onSubmit} disabled={saving}>
                    {saving ? 'Сохранение...' : (editBranch ? 'Сохранить' : 'Создать')}
                </button>
            </div>
        </Modal>
    );
});

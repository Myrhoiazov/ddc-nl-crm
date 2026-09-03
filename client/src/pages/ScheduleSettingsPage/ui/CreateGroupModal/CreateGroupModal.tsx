import { memo } from 'react';
import { Modal } from '@/shared/ui/Modal/Modal';
import type { DanceGroup } from '@/entities/DanceGroup';
import { useCreateGroupForm } from './useCreateGroupForm';
import { CreateGroupModalFields } from './CreateGroupModalFields';
import { CreateGroupModalSlots } from './CreateGroupModalSlots';
import s from './CreateGroupModal.module.scss';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editGroup?: DanceGroup | null;
}

export const CreateGroupModal = memo(
    ({ isOpen, onClose, onSaved, editGroup }: CreateGroupModalProps) => {
        const {
            name, setName,
            style, setStyle,
            level, setLevel,
            maxParticipants, setMaxParticipants,
            lessonPrice, setLessonPrice,
            choreographerId, setChoreographerId,
            slots, addSlot, updateSlot, removeSlot,
            saving,
            branchId, setBranchId,
            choreographers, branches, styles,
            onSubmit,
        } = useCreateGroupForm(isOpen, editGroup, onSaved, onClose);

        return (
            <Modal isOpen={isOpen} onClose={onClose} lazy>
                <div className={s.modal}>
                    <h2 className={s.title}>
                        {editGroup ? 'РЕДАКТИРОВАТЬ ГРУППУ' : 'СОЗДАТЬ ГРУППУ'}
                    </h2>

                    <div className={s.form}>
                        <CreateGroupModalFields
                            name={name}
                            setName={setName}
                            choreographerId={choreographerId}
                            setChoreographerId={setChoreographerId}
                            choreographers={choreographers}
                            style={style}
                            setStyle={setStyle}
                            styles={styles}
                            branchId={branchId}
                            setBranchId={setBranchId}
                            branches={branches}
                            level={level}
                            setLevel={setLevel}
                            maxParticipants={maxParticipants}
                            setMaxParticipants={setMaxParticipants}
                            lessonPrice={lessonPrice}
                            setLessonPrice={setLessonPrice}
                        />
                        <CreateGroupModalSlots
                            slots={slots}
                            onAddSlot={addSlot}
                            onUpdateSlot={updateSlot}
                            onRemoveSlot={removeSlot}
                        />
                    </div>

                    <button className={s.submitBtn} onClick={onSubmit} disabled={saving}>
                        {saving ? 'Сохранение...' : editGroup ? 'Сохранить' : 'Создать'}
                    </button>
                </div>
            </Modal>
        );
    }
);

import { classNames } from '@/shared/lib/classNames/classNames';
import { memo, useCallback, useState } from 'react';
import { getRouteMollieDetails } from '@/shared/const/router';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { Dropdown } from '@/shared/ui/Popups';
import { Icon } from '@/shared/ui/Icon/Icon';
import Edit from '@/shared/assets/icons/edit-icon.svg';
import { deleteMollieClientById } from '../../model/services/deleteMollieClientById';
import { toast } from 'react-toastify';
import { MollieClientFormModal } from '../MollieClientFormModal/MollieClientFormModal';
import { fetchMollieClientData } from '../../model/services/fetchMollieClientData/fetchMollieClientData';
import { DynamicModuleLoader, ReducersList } from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { mollieClientReducer } from '../../model/slices/mollieClientSlice';

interface EditClientDropdownProps {
    className?: string;
    clientId: string;
    reloadPage?: () => void;
}

const initialReducers: ReducersList = {
    mollieClientForm: mollieClientReducer,
};

export const EditMollieClientDropdown = memo((props: EditClientDropdownProps) => {
    const { className, clientId, reloadPage } = props;
    const [isModalOpen, setIsModalOpen] = useState(false);

    const dispatch = useAppDispatch();

    const deleteClientGandler = useCallback(async () => {
        const result = await dispatch(deleteMollieClientById(clientId));
        if (result.meta.requestStatus === 'fulfilled') {
            reloadPage?.();
            toast.info('Клиент успешно удален');
        }
    }, [dispatch]);

    const setIsModalOpenHandle = useCallback(async () => {
        setIsModalOpen(true);
        dispatch(fetchMollieClientData(clientId));
    }, [dispatch]);

    const setIsModalCloseHandle = useCallback(async () => {
        setIsModalOpen(false);
    }, [dispatch]);

    const items = [
        {
            content: 'Просмотреть',
            href: getRouteMollieDetails(String(clientId)),
        },
        {
            content: 'Обновить',
            onClick: setIsModalOpenHandle,
        },
        {
            content: 'Удалить',
            onClick: deleteClientGandler,
        },
    ];

    return (
        <>
            <Dropdown
                direction="bottom left"
                className={classNames('', {}, [className])}
                items={items}
                trigger={<Icon Svg={Edit} width={24} height={24} color="stroke" />}
            />
            <DynamicModuleLoader reducers={initialReducers}>
                <MollieClientFormModal
                    clientId={clientId}
                    isOpen={isModalOpen}
                    onClose={setIsModalCloseHandle}
                    reloadPage={reloadPage}
                />
            </DynamicModuleLoader>
        </>
    );
});

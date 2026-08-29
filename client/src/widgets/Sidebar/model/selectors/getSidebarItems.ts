import { createSelector } from "@reduxjs/toolkit";
import { getUserAuthData } from "@/entities/User";
import { RoutePath } from "@/shared/config/routeConfig/routeConfig";
import Main from '@/shared/assets/icons/main.svg';
import Clients from '@/shared/assets/icons/clients.svg';
import Transactions from '@/shared/assets/icons/transactions.svg';
import Choreographers from '@/shared/assets/icons/choreographers.svg';
import Schedule from '@/shared/assets/icons/calendar-20-20.svg';
import Students from '@/shared/assets/icons/students.svg';
import Company from '@/shared/assets/icons/company.svg';
import ContentHub from '@/shared/assets/icons/content-hub.svg';
import CrmSettings from '@/shared/assets/icons/crm-settings.svg';
import Mail from '@/shared/assets/icons/mail-20-20.svg';
import { SidebarItemType } from "../types/sidebar";
import { RoleKey } from "@/entities/Role";

export const getSidebarItems = createSelector(
    getUserAuthData,
    (userData) => {
        const sidebarItemsList: SidebarItemType[] = [
            { path: RoutePath.main, Icon: Main, text: 'Главная' },
        ];

        if (userData?.role === RoleKey.ADMIN) {
            sidebarItemsList.push(
                { path: RoutePath.transactions, Icon: Transactions, text: 'Транзакции' },
                { path: RoutePath.email, Icon: Mail, text: 'Почта' },
            );
        }

        sidebarItemsList.push(
            {
                path: RoutePath.dance_school,
                Icon: Schedule,
                text: 'Школа танцев',
                iconColor: 'stroke',
                children: [
                    { path: RoutePath.schedule, Icon: Schedule, text: 'Расписание', iconColor: 'stroke' },
                    { path: RoutePath.clients, Icon: Clients, text: 'Ученики' },
                    { path: RoutePath.choreographers, Icon: Choreographers, text: 'Хореографы', iconColor: 'stroke' },
                    { path: RoutePath.dance_groups, Icon: Students, text: 'Группы', iconColor: 'stroke' },
                    { path: RoutePath.dance_styles, Icon: Schedule, text: 'Стили', iconColor: 'stroke' },
                ],
            },
            {
                path: RoutePath.company,
                Icon: Company,
                text: 'Компания',
                iconColor: 'stroke',
                children: [
                    { path: RoutePath.mollie, Icon: Company, text: 'Mollie', iconColor: 'stroke' },
                    { path: RoutePath.organization_brands, Icon: Company, text: 'Организация и бренды', iconColor: 'stroke' },
                    { path: RoutePath.branches, Icon: Company, text: 'Филиалы', iconColor: 'stroke' },
                    { path: RoutePath.invoices, Icon: Transactions, text: 'Инвойсы' },
                    { path: RoutePath.payment_reminders, Icon: Mail, text: 'Напоминания об оплате' },
                ],
            },
            { path: RoutePath.content_hub, Icon: ContentHub, text: 'Контент-хаб', iconColor: 'stroke' },
            { path: RoutePath.crm_settings, Icon: CrmSettings, text: 'Настройки CRM', iconColor: 'stroke' },
        );

        return sidebarItemsList;
    }
);

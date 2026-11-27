export enum Role {
    ADMIN = 'Администратор',
    MANAGER = 'Менеджер',
    GUEST = 'Гость',
}

export enum RoleKey {
    ADMIN = "ADMIN",
    MANAGER = "MANAGER",
    GUEST = "GUEST",
}

export const RoleLabels: Record<RoleKey, string> = {
    [RoleKey.ADMIN]: "Администратор",
    [RoleKey.MANAGER]: "Менеджер",
    [RoleKey.GUEST]: "Гость",
};

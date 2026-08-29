export enum AppRoutes {
    MAIN = 'main',
    SETTINGS = 'settings',
    ABOUT = 'about',
    PROFILE = 'profile',
    ARTICLES = 'articles',
    ARTICLE_DETAILS = 'article_details',
    ARTICLE_CREATE = 'article_create',
    ARTICLE_EDIT = 'article_edit',
    CLIENTS = 'clients',
    CLIENT_DETAILS = 'client_details',
    CLIENT_EDIT = 'client_edit',
    ADMIN_PANEL = 'admin_panel',
    FORBIDDEN = 'forbidden',
    TRANSACTIONS = 'transactions',
    TRANSACTION_DETAILS = 'transaction_details',
    TRANSACTION_EDIT = 'transaction_edit',
    TRANSACTION_CREATE = 'transaction_create',
    MOLLIE = 'mollie',
    // last
    NOT_FOUND = 'not_found',
}

export const getRouteMain = () => '/';
export const getRouteSettings = () => '/settings';
export const getRouteAbout = () => '/about';
export const getRouteProfile = (id: string) => `/profile/${id}`;
export const getRouteArticles = () => '/articles';
export const getRouteArticleDetails = (id: string) => `/articles/${id}`;
export const getRouteArticleCreate = () => '/articles/new';
export const getRouteArticleEdit = (id: string) => `/articles/${id}/edit`;
export const getRouteClients = () => '/clients';
export const getRouteClientDetails = (id: string) => `/clients/${id}`;
export const getRouteClientEdit = (id: string) => `/clients/${id}/edit`;
export const getRouteAdmin = () => '/admin';
export const getRouteForbidden = () => '/forbidden';
export const getRouteTransactions = () => '/transactions';
export const getRouteTransactionDetails = (id: string) => `/transactions/${id}`;
export const getRouteTransactionEdit = (id: string) => `/transactions/${id}/edit`;
export const getRouteTransactionCreate = () => '/transactions/new';
export const getRouteMollieDetails = (id: string) => `/mollie/customers/${id}`;

export const AppRouteByPathPattern: Record<string, AppRoutes> = {
    [getRouteMain()]: AppRoutes.MAIN,
    [getRouteSettings()]: AppRoutes.SETTINGS,
    [getRouteAbout()]: AppRoutes.ABOUT,
    [getRouteProfile(':id')]: AppRoutes.PROFILE,
    [getRouteArticles()]: AppRoutes.ARTICLES,
    [getRouteArticleDetails(':id')]: AppRoutes.ARTICLE_DETAILS,
    [getRouteArticleCreate()]: AppRoutes.ARTICLE_CREATE,
    [getRouteArticleEdit(':id')]: AppRoutes.ARTICLE_EDIT,
    [getRouteClients()]: AppRoutes.CLIENTS,
    [getRouteClientDetails(':id')]: AppRoutes.CLIENT_DETAILS,
    [getRouteClientEdit(':id')]: AppRoutes.CLIENT_EDIT,
    [getRouteAdmin()]: AppRoutes.ADMIN_PANEL,
    [getRouteForbidden()]: AppRoutes.FORBIDDEN,
};

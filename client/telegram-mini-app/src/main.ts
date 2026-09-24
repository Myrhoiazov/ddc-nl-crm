import { renderDashboard } from './screens/dashboard';
import { renderNewStudent } from './screens/new-student';
import { renderSearch } from './screens/search';
import { initializeTelegram } from './telegram';

initializeTelegram();

const app = document.getElementById('app');
const nav = document.getElementById('nav');
const screens = { dashboard: renderDashboard, search: renderSearch, 'new-student': renderNewStudent };
type ScreenName = keyof typeof screens;

const showScreen = (name: ScreenName) => {
    if (!app) return;
    nav?.querySelectorAll<HTMLButtonElement>('button[data-screen]').forEach((button) => {
        if (button.dataset.screen === name) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
    });
    void screens[name](app);
    app.focus({ preventScroll: true });
};

nav?.querySelectorAll<HTMLButtonElement>('button[data-screen]').forEach((button) => {
    button.addEventListener('click', () => showScreen(button.dataset.screen as ScreenName));
});

showScreen('dashboard');

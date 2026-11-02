import { useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ToastProvider, useToast } from '../components/Toast';
import { HomePage } from '../modules/home/HomePage';
import { BackupPage } from '../modules/settings/BackupPage';
import { SettingsPage } from '../modules/settings/SettingsPage';
import { SettingsContext, useSettingsStore } from '../modules/settings/store';
import { type AppServices } from './bootstrap';
import { ServicesContext } from './services';
import { AppShell } from './AppShell';
import { useHashRoute } from './routes';
import { MorePage } from './MorePage';
import { PlaceholderPage } from './PlaceholderPage';
import { PlanContext } from '../modules/plan/store';
import { PlanPage } from '../modules/plan/PlanPage';
import { PlanCoordinator } from './PlanCoordinator';
import { ReportContext } from '../modules/report/store';
import { ReportPage } from '../modules/report/ReportPage';
import { TemplateManager } from '../modules/report/TemplateManager';
import { FitnessContext } from '../modules/fitness/store';
import { FitnessPage } from '../modules/fitness/FitnessPage';
import { RestTimer } from '../modules/fitness/RestTimer';
import { AppearancePage } from '../modules/settings/AppearancePage';
import { ThemeBackdrop } from './ThemeBackdrop';
import { ExpenseContext } from '../modules/expense/store';
import { ExpensePage } from '../modules/expense/ExpensePage';
import { EnglishContext } from '../modules/english/store';
import { EnglishPage } from '../modules/english/EnglishPage';
import { PwaProvider } from './PwaProvider';

function Content({ recovered }: { recovered: boolean }) {
  const route = useHashRoute();
  const theme = useSettingsStore((state) => state.settings.theme);
  const toast = useToast();
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
      const color = getComputedStyle(document.documentElement).getPropertyValue('--color-canvas').trim();
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', `rgb(${color})`);
    };
    apply(); media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => { if (recovered) toast('上次恢复未完成，已恢复导入前的记录'); }, [recovered, toast]);
  useEffect(() => { window.scrollTo(0, 0); document.title = '个人工作台'; }, [route]);
  return <><ThemeBackdrop/><RestTimer/><AppShell route={route}>{route === '/home' ? <HomePage /> : route === '/plan' ? <PlanPage /> : route === '/more' ? <MorePage />
    : route === '/fitness' ? <FitnessPage/> : route === '/english' ? <EnglishPage/> : route === '/more/settings/appearance' ? <AppearancePage/>
    : route === '/more/report' ? <ReportPage /> : route === '/more/settings/templates' ? <TemplateManager />
    : route === '/more/settings' ? <SettingsPage /> : route === '/more/backup' ? <BackupPage /> : route === '/more/expense'? <ExpensePage/> : <PlaceholderPage route={route} />}</AppShell></>;
}
export function App({ services }: { services: AppServices }) {
  return <ErrorBoundary><PwaProvider><ServicesContext.Provider value={services}><SettingsContext.Provider value={services.settingsStore}>
    <PlanContext.Provider value={services.planStore}><ReportContext.Provider value={services.reportStore}><FitnessContext.Provider value={services.fitnessStore}><ExpenseContext.Provider value={services.expenseStore}><EnglishContext.Provider value={services.englishStore}><ToastProvider><PlanCoordinator /><Content recovered={services.recovered} /></ToastProvider></EnglishContext.Provider></ExpenseContext.Provider></FitnessContext.Provider></ReportContext.Provider></PlanContext.Provider>
  </SettingsContext.Provider></ServicesContext.Provider></PwaProvider></ErrorBoundary>;
}

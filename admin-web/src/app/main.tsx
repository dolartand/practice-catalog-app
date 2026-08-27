import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { AppProviders } from './providers';
import { router } from './router';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Не найден #root в index.html');
}

createRoot(rootElement).render(
  <AppProviders>
    <RouterProvider router={router} />
  </AppProviders>,
);

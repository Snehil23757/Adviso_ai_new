import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {AuthProvider} from './lib/AuthContext.tsx';
import {SubscriptionProvider} from './subscriptions/SubscriptionProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SubscriptionProvider>
        <App />
      </SubscriptionProvider>
    </AuthProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => registration.update())
        .catch(() => {
          // The app still works normally when service workers are unavailable.
        });
    });
  } else {
    // A production worker previously installed on localhost can cache source
    // modules and make Vite serve an obsolete app during local development.
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())));
  }
}

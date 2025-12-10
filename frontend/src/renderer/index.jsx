import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App';
import LicensePage from './pages/LicensePage';
import { store } from './store';
import './styles/main.css';

// ハッシュルーティング
function Router() {
  const [route, setRoute] = React.useState(window.location.hash);

  React.useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // ライセンス画面
  if (route === '#/license') {
    return <LicensePage />;
  }

  // メインアプリ
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);

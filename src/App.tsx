import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import SessionsPage from './pages/SessionsPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/sessoes" replace />} />
        <Route path="/sessoes" element={<SessionsPage />} />
        <Route path="/historico" element={<HistoryPage />} />
        <Route path="/ajustes" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/sessoes" replace />} />
      </Route>
    </Routes>
  );
}

import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import SessionsPage from './pages/SessionsPage';
import SessionEditorPage from './pages/SessionEditorPage';
import RunPage from './pages/RunPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/rodar/:id" element={<RunPage />} />
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/sessoes" replace />} />
        <Route path="/sessoes" element={<SessionsPage />} />
        <Route path="/sessoes/:id" element={<SessionEditorPage />} />
        <Route path="/historico" element={<HistoryPage />} />
        <Route path="/ajustes" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/sessoes" replace />} />
      </Route>
    </Routes>
  );
}

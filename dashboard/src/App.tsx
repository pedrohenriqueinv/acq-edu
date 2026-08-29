import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import SetupPage from './pages/SetupPage';
import MatrixPage from './pages/MatrixPage';
import CalendarPage from './pages/CalendarPage';
import LessonEditor from './pages/LessonEditor';
import LoginPage from './pages/LoginPage';
import { useAppStore } from './store/useAppStore';
import { getAuthSession } from './services/license';

function App() {
  const { loadConfig, loadMatrixSkills } = useAppStore();
  const [auth, setAuth] = useState(() => getAuthSession());

  useEffect(() => {
    loadConfig();
    loadMatrixSkills();
  }, []);

  const refreshAuth = () => {
    setAuth(getAuthSession());
  };

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#00236f',
            color: '#f8fafc',
            borderRadius: '12px',
            fontSize: '14px',
            boxShadow: '0 10px 25px -5px rgba(0, 35, 111, 0.2)',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      {!auth.isValid ? (
        <LoginPage onSuccess={refreshAuth} />
      ) : (
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/calendario" replace />} />
            <Route path="configuracao" element={<SetupPage />} />
            <Route path="matriz" element={<MatrixPage />} />
            <Route path="calendario" element={<CalendarPage />} />
            <Route path="aula/:id" element={<LessonEditor />} />
          </Route>
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;

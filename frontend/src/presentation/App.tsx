import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { AdminGameCatalogPage } from './pages/AdminGameCatalogPage';
import { ChooseGamePage } from './pages/ChooseGamePage';
import { RequireAdmin } from './user-profile/RequireAdmin';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      <Route
        path="/jeux"
        element={
          <RequireAuth>
            <ChooseGamePage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/catalogue"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AdminGameCatalogPage />
            </RequireAdmin>
          </RequireAuth>
        }
      />
    </Routes>
  );
}

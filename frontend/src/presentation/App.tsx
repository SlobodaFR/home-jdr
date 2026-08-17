import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import { CharacterSheetPage } from './pages/CharacterSheetPage';
import { CreateCharacterPage } from './pages/CreateCharacterPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';

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
        path="/characters/new"
        element={
          <RequireAuth>
            <CreateCharacterPage />
          </RequireAuth>
        }
      />
      <Route
        path="/characters/:id"
        element={
          <RequireAuth>
            <CharacterSheetPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

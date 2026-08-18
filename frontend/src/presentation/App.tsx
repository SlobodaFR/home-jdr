import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import { CharacterCreationChatPage } from './pages/CharacterCreationChatPage';
import { CharacterSheetPage } from './pages/CharacterSheetPage';
import { CreateCharacterPage } from './pages/CreateCharacterPage';
import { CreateSessionPage } from './pages/CreateSessionPage';
import { HomePage } from './pages/HomePage';
import { JoinSessionPage } from './pages/JoinSessionPage';
import { LoginPage } from './pages/LoginPage';
import { AdminGameCatalogPage } from './pages/AdminGameCatalogPage';
import { AdminUsagePage } from './pages/AdminUsagePage';
import { ChooseGamePage } from './pages/ChooseGamePage';
import { NotificationSettingsPage } from './pages/NotificationSettingsPage';
import { SessionPage } from './pages/SessionPage';
import { WorldMapPage } from './pages/WorldMapPage';
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
      <Route
        path="/jeux"
        element={
          <RequireAuth>
            <ChooseGamePage />
          </RequireAuth>
        }
      />
      <Route
        path="/sessions/new"
        element={
          <RequireAuth>
            <CreateSessionPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sessions/join"
        element={
          <RequireAuth>
            <JoinSessionPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sessions/:id"
        element={
          <RequireAuth>
            <SessionPage />
          </RequireAuth>
        }
      />
      <Route
        path="/character-creation/:id"
        element={
          <RequireAuth>
            <CharacterCreationChatPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sessions/:id/map"
        element={
          <RequireAuth>
            <WorldMapPage />
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
      <Route
        path="/admin/usage"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AdminUsagePage />
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/settings/notifications"
        element={
          <RequireAuth>
            <NotificationSettingsPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

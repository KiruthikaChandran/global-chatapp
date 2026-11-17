import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ChatRequests from './pages/ChatRequests';
import Dashboard from './pages/Dashboard';
import DiscoverUsers from './pages/DiscoverUsers';
import GlobalChat from './pages/GlobalChat';
import LiveUsers from './pages/LiveUsers';
import Login from './pages/Login';
import OnlineUsers from './pages/OnlineUsers';
import PrivateChat from './pages/PrivateChat';
import Profile from './pages/Profile';
import Register from './pages/Register';
import Settings from './pages/Settings';
import { GuestRoute, ProtectedRoute } from './routes/ProtectedRoute';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <Register />
                </GuestRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/global-chat"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <GlobalChat />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/discover"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DiscoverUsers />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/online-users"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <OnlineUsers />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/live-users"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <LiveUsers />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ChatRequests />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/private-chat"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PrivateChat />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/private-chat/:conversationId"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <PrivateChat />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Profile />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

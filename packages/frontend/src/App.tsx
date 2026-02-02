import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Layout
import { AppLayout } from '@/components/layout/app-layout';

// Pages
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { UserList } from '@/pages/users/UserList';
import { UserDetail } from '@/pages/users/UserDetail';
import { GroupList } from '@/pages/groups/GroupList';
import { GroupDetail } from '@/pages/groups/GroupDetail';
import { Settings } from '@/pages/Settings';
import { AuditLogs } from '@/pages/AuditLogs';
import { NotFound } from '@/pages/NotFound';
import { Forbidden } from '@/pages/Forbidden';

// Components
import { Toaster } from '@/components/ui/toaster';
import {
  RequireAuth,
  RequirePermission,
} from '@/components/features/permission-gate';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            {/* Dashboard */}
            <Route index element={<Dashboard />} />

            {/* Users */}
            <Route
              path="users"
              element={
                <RequirePermission permission="users:read">
                  <UserList />
                </RequirePermission>
              }
            />
            <Route
              path="users/:id"
              element={
                <RequirePermission permission="users:read">
                  <UserDetail />
                </RequirePermission>
              }
            />

            {/* Groups */}
            <Route
              path="groups"
              element={
                <RequirePermission permission="groups:read">
                  <GroupList />
                </RequirePermission>
              }
            />
            <Route
              path="groups/:id"
              element={
                <RequirePermission permission="groups:read">
                  <GroupDetail />
                </RequirePermission>
              }
            />

            {/* Audit Logs */}
            <Route
              path="audit-logs"
              element={
                <RequirePermission permission="audit:read">
                  <AuditLogs />
                </RequirePermission>
              }
            />

            {/* Settings - accessible to all authenticated users */}
            <Route path="settings" element={<Settings />} />

            {/* Error pages */}
            <Route path="forbidden" element={<Forbidden />} />
            <Route path="404" element={<NotFound />} />

            {/* Catch-all redirect to 404 */}
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Redirect root to dashboard if trying to access unknown route */}
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>

        {/* Toast notifications */}
        <Toaster />
      </BrowserRouter>

      {/* React Query Devtools - only in development */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;

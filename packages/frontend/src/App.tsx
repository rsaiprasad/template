import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Navigate, Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom';

// Auth initializer - must be at root level
import { AuthInitializer } from '@/components/features/auth-initializer';
// Layout
import { AppLayout } from '@/components/layout/app-layout';
import { NavigationProgress } from '@/components/navigation-progress';

import { AuditLogs } from '@/pages/AuditLogs';
import { Dashboard } from '@/pages/Dashboard';
import { Forbidden } from '@/pages/Forbidden';
// Pages
import { Login } from '@/pages/Login';
import { NotFound } from '@/pages/NotFound';
import { Settings } from '@/pages/Settings';
import { GroupDetail } from '@/pages/groups/GroupDetail';
import { GroupList } from '@/pages/groups/GroupList';
import { UserDetail } from '@/pages/users/UserDetail';
import { UserList } from '@/pages/users/UserList';

import { RequireAuth, RequirePermission } from '@/components/features/permission-gate';
// Components
import { Toaster } from '@/components/ui/toaster';

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

// Root layout that wraps all routes
function RootLayout() {
  return (
    <>
      <NavigationProgress />
      <Outlet />
      <Toaster />
    </>
  );
}

// Protected layout wrapper
function ProtectedLayout() {
  return (
    <RequireAuth>
      <AppLayout />
    </RequireAuth>
  );
}

// Create router with data router API
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public routes
      {
        path: '/login',
        element: <Login />,
      },
      // Protected routes
      {
        element: <ProtectedLayout />,
        children: [
          // Dashboard
          {
            index: true,
            element: <Dashboard />,
          },
          // Users
          {
            path: 'users',
            element: (
              <RequirePermission permission="users:read">
                <UserList />
              </RequirePermission>
            ),
          },
          {
            path: 'users/:id',
            element: (
              <RequirePermission permission="users:read">
                <UserDetail />
              </RequirePermission>
            ),
          },
          // Groups
          {
            path: 'groups',
            element: (
              <RequirePermission permission="groups:read">
                <GroupList />
              </RequirePermission>
            ),
          },
          {
            path: 'groups/:id',
            element: (
              <RequirePermission permission="groups:read">
                <GroupDetail />
              </RequirePermission>
            ),
          },
          // Audit Logs
          {
            path: 'audit-logs',
            element: (
              <RequirePermission permission="audit:read">
                <AuditLogs />
              </RequirePermission>
            ),
          },
          // Settings - accessible to all authenticated users
          {
            path: 'settings',
            element: <Settings />,
          },
          // Error pages
          {
            path: 'forbidden',
            element: <Forbidden />,
          },
          {
            path: '404',
            element: <NotFound />,
          },
          // Catch-all redirect to 404
          {
            path: '*',
            element: <NotFound />,
          },
        ],
      },
      // Redirect unknown routes to 404
      {
        path: '*',
        element: <Navigate to="/404" replace />,
      },
    ],
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <RouterProvider router={router} />
      </AuthInitializer>
      {/* React Query Devtools - only in development */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;

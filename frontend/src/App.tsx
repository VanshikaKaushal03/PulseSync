import React, { useEffect } from 'react';
import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { Toaster } from 'react-hot-toast';
import { AppShell } from './components/layout/AppShell';
import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/Dashboard';
import { StreamSources } from './pages/StreamSources';
import { ReplayCenter } from './pages/ReplayCenter';
import { VisualPipeline } from './pages/VisualPipeline';
import { DeliveryChannels } from './pages/DeliveryChannels';
import LiveFeed from './components/LiveFeed';
import { ClientTracker } from './pages/ClientTracker';
import { useAuthStore } from './store/authStore';
import { useRealtime } from './hooks/useRealtime';

// Strict Role-Based Auth Guard
function RequireAuth({ children, role }: { children: React.ReactNode, role: 'admin' | 'customer' }) {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  // Actually initialize the realtime connections
  useRealtime();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/login' });
      return;
    }
    const currentRole = user?.role || 'admin';
    if (currentRole !== role) {
      if (!user?.role) {
        useAuthStore.getState().logout();
        navigate({ to: '/login' });
        return;
      }
      if (currentRole === 'customer') navigate({ to: '/client/tracker' });
      else navigate({ to: '/admin/dashboard' });
    }
  }, [isAuthenticated, user, role, navigate]);

  const currentRole = user?.role || 'admin';
  if (!isAuthenticated || currentRole !== role) return null;
  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'customer') navigate({ to: '/client/tracker' });
      else navigate({ to: '/admin/dashboard' });
    }
  }, [isAuthenticated, user, navigate]);

  if (isAuthenticated) return null;
  return <>{children}</>;
}

// ── Stable layout components (must be named, not inline, to prevent unmounting on tab switch) ──

function RootLayout() {
  return <Outlet />;
}

function LoginLayout() {
  return (
    <GuestGuard>
      <Login />
    </GuestGuard>
  );
}

function AdminLayout() {
  return (
    <RequireAuth role="admin">
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireAuth>
  );
}

function ClientLayout() {
  return (
    <RequireAuth role="customer">
      <Outlet />
    </RequireAuth>
  );
}

function IndexRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/login' });
    } else if (!user?.role) {
      useAuthStore.getState().logout();
      navigate({ to: '/login' });
    } else if (user?.role === 'customer') {
      navigate({ to: '/client/tracker' });
    } else {
      navigate({ to: '/admin/dashboard' });
    }
  }, [isAuthenticated, user, navigate]);
  return null;
}

function AdminDeliveryRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: '/admin/delivery' });
  }, [navigate]);
  return null;
}

// ── Route tree ──

const rootRoute = createRootRoute({ component: RootLayout });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginLayout,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminLayout,
});

const clientRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/client',
  component: ClientLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexRedirect,
});

const adminDashboardRoute = createRoute({ getParentRoute: () => adminRoute, path: '/dashboard', component: Dashboard });
const adminEventsRoute = createRoute({ getParentRoute: () => adminRoute, path: '/events', component: LiveFeed });
const adminSourcesRoute = createRoute({ getParentRoute: () => adminRoute, path: '/sources', component: StreamSources });
const adminReplayRoute = createRoute({ getParentRoute: () => adminRoute, path: '/replay', component: ReplayCenter });
const adminSubsRoute = createRoute({ getParentRoute: () => adminRoute, path: '/subscriptions', component: AdminDeliveryRedirect });
const adminPipelineRoute = createRoute({ getParentRoute: () => adminRoute, path: '/pipeline', component: VisualPipeline });
const adminDeliveryRoute = createRoute({ getParentRoute: () => adminRoute, path: '/delivery', component: DeliveryChannels });

const clientTrackerRoute = createRoute({ getParentRoute: () => clientRoute, path: '/tracker', component: ClientTracker });

// Create routing tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  adminRoute.addChildren([
    adminDashboardRoute,
    adminEventsRoute,
    adminSourcesRoute,
    adminReplayRoute,
    adminSubsRoute,
    adminPipelineRoute,
    adminDeliveryRoute,
  ]),
  clientRoute.addChildren([
    clientTrackerRoute,
  ]),
]);

// Create router
const router = createRouter({ routeTree });

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

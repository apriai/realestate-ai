import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useEffect, useRef } from "react";

// Layouts
import AppLayout from "@/components/layout/AppLayout";
import AdminLayout from "@/components/layout/AdminLayout";

// Pages
import Home from "@/pages/Home";
import Portfolio from "@/pages/Portfolio";
import PropertyDetail from "@/pages/PropertyDetail";
import PropertyNew from "@/pages/PropertyNew";
import PropertyEdit from "@/pages/PropertyEdit";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import Zones from "@/pages/Zones";
import ZoneDetail from "@/pages/ZoneDetail";
import AIChat from "@/pages/AIChat";
import AIChatHistory from "@/pages/AIChatHistory";
import Notifications from "@/pages/Notifications";
import Profile from "@/pages/Profile";
import Invest from "@/pages/Invest";
import AdminDashboard from "@/pages/AdminDashboard";
import Settings from "@/pages/Settings";
import Analisis from "@/pages/Analisis";
import OnboardingModal from "@/components/OnboardingModal";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

function SignInPage() {
  const search = new URLSearchParams(window.location.search);
  const redirectTo = search.get("redirect") || "/inicio";
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/iniciar-sesion`}
        signUpUrl={`${basePath}/registro`}
        forceRedirectUrl={`${basePath}${redirectTo}`}
      />
    </div>
  );
}

function SignUpPage() {
  const search = new URLSearchParams(window.location.search);
  const redirectTo = search.get("redirect") || "/inicio";
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/registro`}
        signInUrl={`${basePath}/iniciar-sesion`}
        forceRedirectUrl={`${basePath}${redirectTo}`}
      />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener]);

  return null;
}

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/inicio" />
      </Show>
      <Show when="signed-out">
        <Invest />
      </Show>
    </>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        {children}
      </Show>
      <Show when="signed-out">
        <Redirect to="/iniciar-sesion" />
      </Show>
    </>
  );
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        {children}
      </Show>
      <Show when="signed-out">
        <Redirect to="/iniciar-sesion" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/iniciar-sesion`}
      signUpUrl={`${basePath}/registro`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRoute} />

          <Route path="/iniciar-sesion/*?" component={SignInPage} />
          <Route path="/registro/*?" component={SignUpPage} />

          <Route path="/invertir" component={Invest} />

          <Route path="/admin">
            <AdminRoute>
              <AdminLayout>
                <Switch>
                  <Route path="/admin" component={AdminDashboard} />
                </Switch>
              </AdminLayout>
            </AdminRoute>
          </Route>

          <Route path="/:rest*">
            <ProtectedRoute>
              <AppLayout>
                <Switch>
                  <Route path="/inicio" component={Home} />
                  <Route path="/portafolio" component={Portfolio} />
                  <Route path="/portafolio/nueva" component={PropertyNew} />
                  <Route path="/portafolio/:id/editar" component={PropertyEdit} />
                  <Route path="/portafolio/:id" component={PropertyDetail} />
                  <Route path="/proyectos" component={Projects} />
                  <Route path="/proyectos/:id" component={ProjectDetail} />
                  <Route path="/analisis" component={Analisis} />
                  <Route path="/zonas" component={Zones} />
                  <Route path="/zona/:id" component={ZoneDetail} />
                  <Route path="/ai" component={AIChat} />
                  <Route path="/ai/historial" component={AIChatHistory} />
                  <Route path="/notificaciones" component={Notifications} />
                  <Route path="/perfil" component={Profile} />
                  <Route path="/ajustes" component={Settings} />
                  <Route component={NotFound} />
                </Switch>
              </AppLayout>
            </ProtectedRoute>
          </Route>
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;

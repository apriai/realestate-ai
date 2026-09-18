import { Link, useLocation } from "wouter";
import { 
  Building2, 
  HardHat, 
  Map, 
  Bot, 
  Bell, 
  UserCircle,
  Settings,
  BarChart2
} from "lucide-react";
import { useGetUnreadNotificationCount, useGetMe } from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import OnboardingModal from "@/components/OnboardingModal";

const NAV_ITEMS = [
  { href: "/proyectos", label: "Proyectos", icon: HardHat },
  { href: "/analisis", label: "Análisis", icon: BarChart2 },
  { href: "/ai", label: "IA", icon: Bot },
  { href: "/zonas", label: "Zonas", icon: Map },
  { href: "/portafolio", label: "Portafolio", icon: Building2 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: unreadData, refetch: refetchUnread } = useGetUnreadNotificationCount();
  const { data: meData } = useGetMe();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const inspectionChecked = useRef(false);

  useEffect(() => {
    if (inspectionChecked.current) return;
    inspectionChecked.current = true;
    fetch("/api/notifications/check-inspections", { method: "POST" })
      .then(() => refetchUnread())
      .catch(() => {});
  }, []);

  const unreadCount = unreadData?.count || 0;
  const needsOnboarding = meData && !(meData as any).investorType && !(meData as any).onboardingCompleted && !onboardingDismissed;

  return (
    <>
    <OnboardingModal open={!!needsOnboarding} onComplete={() => setOnboardingDismissed(true)} />
    <div className="flex min-h-[100dvh] w-full flex-col bg-background md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center px-6 border-b border-border">
          <span className="text-xl font-bold tracking-tight text-primary">RealEstate <span className="text-foreground">AI</span></span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4 space-y-1">
          <Link href="/notificaciones" className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              Notificaciones
            </div>
            {unreadCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                {unreadCount}
              </span>
            )}
          </Link>
          <Link href="/perfil" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
            <UserCircle className="h-5 w-5" />
            Perfil
          </Link>
          <Link href="/ajustes" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Settings className="h-5 w-5" />
            Ajustes
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-16 md:pb-0 overflow-y-auto">
        <div className="md:hidden flex h-14 items-center justify-between px-4 border-b border-white/20 dark:border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-10">
          <span className="text-lg font-bold tracking-tight text-primary">RealEstate <span className="text-foreground">AI</span></span>
          <div className="flex items-center gap-2">
            <Link href="/notificaciones" className="relative p-2 text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary"></span>
              )}
            </Link>
            <Link href="/perfil" className="p-2 text-muted-foreground hover:text-foreground">
              <UserCircle className="h-5 w-5" />
            </Link>
          </div>
        </div>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 z-50 flex h-16 w-full items-center justify-around border-t border-white/20 dark:border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur-xl pb-safe md:hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
    </>
  );
}

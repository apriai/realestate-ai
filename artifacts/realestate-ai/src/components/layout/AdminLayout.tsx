import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Building, FileText, Settings, ArrowLeft } from "lucide-react";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background md:flex-row">
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-16 items-center px-6 border-b border-border">
          <span className="text-xl font-bold tracking-tight text-primary">Admin <span className="text-foreground">Portal</span></span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
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
        <div className="border-t border-border p-4">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
            Volver a la App
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden flex h-14 items-center px-4 border-b border-border bg-card sticky top-0 z-10">
          <Link href="/" className="mr-4 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="text-lg font-bold tracking-tight text-primary">Admin <span className="text-foreground">Portal</span></span>
        </div>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

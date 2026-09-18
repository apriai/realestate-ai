import { useListNotifications, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Notification = {
  id: number;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  type: string;
};

function groupByDate(items: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, Notification[]> = {};
  for (const n of items) {
    const d = new Date(n.createdAt);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = "Hoy";
    else if (d.getTime() === yesterday.getTime()) label = "Ayer";
    else label = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return groups;
}

const TYPE_ICONS: Record<string, string> = {
  inspection_due: "🔍",
  investment_update: "💰",
  project_update: "🏗️",
  system: "🔔",
};

export default function Notifications() {
  const { data: notifications, isLoading, refetch } = useListNotifications();
  const markAllMutation = useMarkAllNotificationsRead();

  const handleMarkAll = () => {
    markAllMutation.mutate(undefined, { onSuccess: () => refetch() });
  };

  const grouped = groupByDate((notifications as Notification[] | undefined) ?? []);
  const groupKeys = Object.keys(grouped);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" /> Notificaciones
        </h1>
        {!isLoading && notifications && notifications.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAll} disabled={markAllMutation.isPending}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar todas leídas
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : notifications?.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground bg-card rounded-lg border border-dashed">
          No tienes notificaciones pendientes.
        </div>
      ) : (
        <div className="space-y-8">
          {groupKeys.map(label => (
            <div key={label}>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">{label}</p>
              <div className="space-y-3">
                {grouped[label].map(n => (
                  <Card key={n.id} className={n.read ? 'opacity-60 bg-muted/40' : 'border-primary/20'}>
                    <CardContent className="p-4 flex gap-4">
                      <div className="mt-0.5 flex flex-col items-center gap-2">
                        <span className="text-lg leading-none">{TYPE_ICONS[n.type] ?? "🔔"}</span>
                        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold leading-tight ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>{n.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(n.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

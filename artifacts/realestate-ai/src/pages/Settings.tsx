import { useUser } from "@clerk/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Bell, Shield, Globe, LogOut, Trash2, CheckCircle2, UserCircle } from "lucide-react";
import { useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const DEFAULT_PREFS = {
  nuevasZonas: true,
  actualizacionesProyecto: true,
  alertasPrecios: false,
  resumenSemanal: true,
};

type NotifPrefs = typeof DEFAULT_PREFS;

const INVESTOR_TYPES = [
  { value: "conservador", label: "Conservador — bajo riesgo, estabilidad" },
  { value: "moderado", label: "Moderado — balance riesgo/retorno" },
  { value: "agresivo", label: "Agresivo — máximo retorno" },
  { value: "institucional", label: "Institucional — capital mayor a $10M" },
];

export default function Settings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: meData, isLoading } = useGetMe();

  const [notifications, setNotifications] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [investorType, setInvestorType] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const serverPrefs = (meData as any)?.notificationPrefs;
    if (serverPrefs) setNotifications({ ...DEFAULT_PREFS, ...serverPrefs });
    const type = (meData as any)?.investorType;
    if (type) setInvestorType(type);
  }, [meData]);

  const patchMe = async (data: Record<string, unknown>) => {
    const resp = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!resp.ok) throw new Error("Error guardando");
    return resp.json();
  };

  const handleToggle = async (key: keyof NotifPrefs) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    setSaving(true);
    setSaved(false);
    try {
      await patchMe({ notificationPrefs: updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast({ title: "Error guardando preferencias", variant: "destructive" });
      setNotifications(notifications);
    } finally {
      setSaving(false);
    }
  };

  const handleInvestorTypeChange = async (value: string) => {
    setInvestorType(value);
    setSaving(true);
    try {
      await patchMe({ investorType: value });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({ title: "Perfil actualizado" });
    } catch {
      toast({ title: "Error actualizando perfil", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const NOTIF_ITEMS = [
    { key: "nuevasZonas" as const, label: "Nuevas zonas de inversión", desc: "Cuando se añadan zonas con alto potencial" },
    { key: "actualizacionesProyecto" as const, label: "Actualizaciones de proyectos", desc: "Cambios de estado en proyectos activos" },
    { key: "alertasPrecios" as const, label: "Alertas de precios", desc: "Cuando el precio/m² de una zona cambie ±5%" },
    { key: "resumenSemanal" as const, label: "Resumen semanal", desc: "Reporte de rendimiento de tu portafolio" },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground mt-1">Administra tus preferencias de cuenta y notificaciones</p>
      </div>

      {/* Account / Investor Profile */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <UserCircle className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Perfil de Inversor</CardTitle>
            <CardDescription>Tu tipo de inversor afecta las recomendaciones de IA</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Inversor</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={investorType} onValueChange={handleInvestorTypeChange} disabled={saving}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu perfil de riesgo..." />
                </SelectTrigger>
                <SelectContent>
                  {INVESTOR_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
            Tu email de acceso: <span className="font-medium text-foreground">{user?.primaryEmailAddress?.emailAddress}</span>
            <br />La autenticación y contraseña están gestionadas por Clerk.
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <Bell className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <CardTitle className="text-base">Notificaciones</CardTitle>
            <CardDescription>Elige qué alertas deseas recibir</CardDescription>
          </div>
          {isLoading && <Skeleton className="h-4 w-16" />}
          {saved && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />Guardado
            </div>
          )}
          {saving && !saved && <span className="text-xs text-muted-foreground">Guardando…</span>}
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIF_ITEMS.map((item, i) => (
            <div key={item.key}>
              <div className="flex items-center justify-between">
                <Label htmlFor={`notif-${item.key}`} className="flex flex-col gap-1 cursor-pointer">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.desc}</span>
                </Label>
                <Switch
                  id={`notif-${item.key}`}
                  checked={notifications[item.key]}
                  onCheckedChange={() => handleToggle(item.key)}
                  disabled={isLoading || saving}
                />
              </div>
              {i < NOTIF_ITEMS.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Regional */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <Globe className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Idioma y región</CardTitle>
            <CardDescription>Configuración regional</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Idioma", value: "Español (México)" },
            { label: "Moneda", value: "MXN (Peso Mexicano)" },
            { label: "Zona horaria", value: "América/Ciudad_de_México" },
          ].map((item, i, arr) => (
            <div key={item.label}>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-sm text-muted-foreground">{item.value}</span>
              </div>
              {i < arr.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Seguridad</CardTitle>
            <CardDescription>Autenticación y acceso</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Autenticación de dos factores", value: "Gestionado por Clerk" },
            { label: "Contraseña", value: "Gestionado por Clerk" },
          ].map((item, i, arr) => (
            <div key={item.label}>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full font-medium">{item.value}</span>
              </div>
              {i < arr.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardContent className="pt-6 space-y-3">
          <Button variant="outline" className="w-full border-muted text-foreground" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />Cerrar Sesión
          </Button>
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => toast({ title: "Contacta soporte para eliminar tu cuenta", variant: "destructive" })}
          >
            <Trash2 className="h-4 w-4 mr-2" />Eliminar cuenta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

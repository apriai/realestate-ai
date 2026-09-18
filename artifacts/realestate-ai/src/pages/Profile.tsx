import { useGetMe } from "@workspace/api-client-react";
import { useListProperties } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClerk } from "@clerk/react";
import { Building2, TrendingUp, DollarSign, LogOut } from "lucide-react";
import { Link } from "wouter";

const INVESTOR_TYPE_LABELS: Record<string, string> = {
  conservador: "Conservador",
  moderado: "Moderado",
  agresivo: "Agresivo",
  institucional: "Institucional",
};

const INVESTOR_TYPE_COLORS: Record<string, string> = {
  conservador: "bg-blue-100 text-blue-700",
  moderado: "bg-green-100 text-green-700",
  agresivo: "bg-orange-100 text-orange-700",
  institucional: "bg-purple-100 text-purple-700",
};

function AvatarInitials({ email }: { email?: string }) {
  const initials = email
    ? email.split("@")[0].slice(0, 2).toUpperCase()
    : "IN";
  return (
    <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-md">
      {initials}
    </div>
  );
}

export default function Profile() {
  const { data: user, isLoading } = useGetMe();
  const { data: properties } = useListProperties();
  const { signOut } = useClerk();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);

  const totalAum = properties?.reduce((s, p) => s + (p.currentValue || p.purchasePrice), 0) ?? 0;
  const avgCapRate = properties && properties.length > 0 && properties.some(p => p.netIncome && p.currentValue)
    ? properties
        .filter(p => p.netIncome && p.currentValue)
        .reduce((s, p) => s + (p.netIncome! * 12 / p.currentValue!) * 100, 0)
        / properties.filter(p => p.netIncome && p.currentValue).length
    : null;

  const investorType = (user as any)?.investorType as string | null | undefined;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Perfil del Inversor</h1>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-5">
              <AvatarInitials email={user?.email} />
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold truncate">{user?.email}</p>
                {investorType ? (
                  <Badge className={`mt-1.5 text-sm font-medium ${INVESTOR_TYPE_COLORS[investorType] ?? "bg-secondary text-secondary-foreground"}`}>
                    {INVESTOR_TYPE_LABELS[investorType] ?? investorType}
                  </Badge>
                ) : (
                  <Link href="/ajustes">
                    <Badge variant="outline" className="mt-1.5 text-xs cursor-pointer hover:bg-secondary">
                      Completar perfil →
                    </Badge>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Stats */}
      <Card>
        <CardHeader><CardTitle>Resumen del Portafolio</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-secondary/50">
              <Building2 className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{properties?.length ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Propiedades</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-secondary/50">
              <DollarSign className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-lg font-bold leading-tight">{properties ? formatCurrency(totalAum) : "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">AUM Total</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-secondary/50">
              <TrendingUp className="h-5 w-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary">{avgCapRate != null ? `${avgCapRate.toFixed(1)}%` : "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Cap Rate Prom.</p>
            </div>
          </div>
          {properties && properties.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Aún no tienes propiedades.{" "}
              <Link href="/portafolio/nueva" className="text-primary font-medium">Agregar la primera →</Link>
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardContent className="pt-6">
          <Button variant="outline" className="w-full gap-2" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" /> Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

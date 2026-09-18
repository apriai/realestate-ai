import { useListProperties } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Plus, MapPin, AlertTriangle, TrendingUp, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function getInspectionUrgency(nextInspectionDate?: string | null): "overdue" | "soon" | null {
  if (!nextInspectionDate) return null;
  const now = new Date();
  const d = new Date(nextInspectionDate);
  if (d < now) return "overdue";
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 7) return "soon";
  return null;
}

export default function Portfolio() {
  const { data: properties, isLoading } = useListProperties();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'activa': return 'default';
      case 'vendida': return 'secondary';
      case 'en_rehab': return 'destructive';
      default: return 'outline' as const;
    }
  };

  const totalAum = properties?.reduce((s, p) => s + (p.currentValue || p.purchasePrice), 0) ?? 0;
  const avgOccupancy = properties && properties.length > 0
    ? properties.reduce((s, p) => s + (p.occupancyRate ?? 0), 0) / properties.length
    : 0;
  const withInspectionDue = properties?.filter(p => getInspectionUrgency(p.nextInspectionDate) !== null).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portafolio</h1>
          <p className="text-muted-foreground">Administra y analiza tus propiedades.</p>
        </div>
        <Link href="/portafolio/nueva">
          <Button><Plus className="mr-2 h-4 w-4" />Nueva Propiedad</Button>
        </Link>
      </div>

      {/* Hero Summary */}
      {!isLoading && properties && properties.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">AUM Total</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totalAum)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Propiedades</p>
              <p className="text-xl font-bold">{properties.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Ocupación Prom.</p>
              <p className="text-xl font-bold flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-primary" />{avgOccupancy.toFixed(0)}%
              </p>
            </CardContent>
          </Card>
          <Card className={withInspectionDue > 0 ? "border-orange-400/60" : ""}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Inspecciones</p>
              <p className={`text-xl font-bold flex items-center gap-1 ${withInspectionDue > 0 ? "text-orange-500" : ""}`}>
                {withInspectionDue > 0 && <AlertTriangle className="h-4 w-4" />}
                {withInspectionDue > 0 ? `${withInspectionDue} por atender` : "Al día"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full rounded-none" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : properties?.length === 0 ? (
          <div className="col-span-full py-12 text-center border border-dashed rounded-lg bg-card/50">
            <h3 className="text-lg font-medium">No hay propiedades</h3>
            <p className="text-muted-foreground mb-4 mt-1">Aún no has agregado ninguna propiedad a tu portafolio.</p>
            <Link href="/portafolio/nueva"><Button variant="outline">Agregar la primera</Button></Link>
          </div>
        ) : (
          properties?.map((property) => {
            const urgency = getInspectionUrgency(property.nextInspectionDate);
            const borderClass = urgency === "overdue"
              ? "border-red-400/70"
              : urgency === "soon"
              ? "border-orange-400/70"
              : "";

            return (
              <Link key={property.id} href={`/portafolio/${property.id}`}>
                <Card className={`overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group ${borderClass}`}>
                  <div className="aspect-[4/3] bg-muted relative">
                    {property.images && property.images.length > 0 ? (
                      <img
                        src={`/api/storage${property.images[0]}`}
                        alt={property.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
                        <ImageOff className="h-10 w-10" />
                        <span className="text-xs">Sin fotos</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      <Badge variant={getStatusVariant(property.status) as any} className="capitalize shadow-sm">
                        {property.status.replace('_', ' ')}
                      </Badge>
                      {urgency === "overdue" && (
                        <Badge variant="destructive" className="text-[10px] gap-1 shadow-sm">
                          <AlertTriangle className="h-3 w-3" />Inspección vencida
                        </Badge>
                      )}
                      {urgency === "soon" && (
                        <Badge className="text-[10px] gap-1 shadow-sm bg-orange-500 hover:bg-orange-600">
                          <AlertTriangle className="h-3 w-3" />Inspección próxima
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
                    <div className="flex items-center text-muted-foreground text-sm mt-1 mb-3">
                      <MapPin className="h-3 w-3 mr-1" />
                      <span className="line-clamp-1">{property.address}, {property.city}</span>
                    </div>
                    <div className="flex justify-between items-end border-t pt-3 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Valor Actual</p>
                        <p className="font-bold text-lg">{formatCurrency(property.currentValue || property.purchasePrice)}</p>
                      </div>
                      {property.netIncome && property.currentValue && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Cap Rate</p>
                          <p className="font-bold text-primary">
                            {((property.netIncome * 12 / property.currentValue) * 100).toFixed(1)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

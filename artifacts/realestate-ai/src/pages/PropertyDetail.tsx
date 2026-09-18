import { useState } from "react";
import { useGetProperty, useDeleteProperty } from "@workspace/api-client-react";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Edit, Trash2, MapPin, Home as HomeIcon, TrendingUp, Calendar, DollarSign, AlertTriangle, Clock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import PhotoLightbox from "@/components/PhotoLightbox";

function getInspectionStatus(nextInspectionDate?: string | null): "overdue" | "soon" | "ok" | null {
  if (!nextInspectionDate) return null;
  const now = new Date();
  const d = new Date(nextInspectionDate);
  if (d < now) return "overdue";
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 7) return "soon";
  return "ok";
}

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const propertyId = parseInt(id, 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: property, isLoading } = useGetProperty(propertyId, {
    query: { enabled: !isNaN(propertyId), queryKey: ['getProperty', propertyId] as any }
  });

  const deleteMutation = useDeleteProperty();

  const handleDelete = () => {
    deleteMutation.mutate({ id: propertyId }, {
      onSuccess: () => {
        toast({ title: "Propiedad eliminada" });
        setLocation('/portafolio');
      },
      onError: () => {
        toast({ title: "Error al eliminar", variant: "destructive" });
      }
    });
  };

  const formatCurrency = (value?: number | null) => {
    if (value == null) return "N/A";
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!property) return <div className="p-8 text-center">Propiedad no encontrada</div>;

  const capRate = property.netIncome && property.currentValue
    ? ((property.netIncome * 12 / property.currentValue) * 100).toFixed(2)
    : "N/A";

  const inspStatus = getInspectionStatus(property.nextInspectionDate);
  const inspDate = property.nextInspectionDate ? new Date(property.nextInspectionDate) : null;
  const images = property.images ?? [];

  return (
    <>
      {lightboxIndex !== null && (
        <PhotoLightbox
          images={images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      <div className="space-y-6">
        {/* Inspection overdue alert */}
        {inspStatus === "overdue" && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Inspección vencida</p>
              <p className="text-sm mt-0.5">
                La inspección estaba programada para el{" "}
                {inspDate?.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}.
                Programa una nueva lo antes posible.
              </p>
            </div>
          </div>
        )}
        {inspStatus === "soon" && (
          <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg p-4 text-orange-800">
            <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Inspección próxima</p>
              <p className="text-sm mt-0.5">
                Tienes una inspección programada para el{" "}
                {inspDate?.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <Link href="/portafolio">
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{property.title}</h1>
            <div className="flex items-center text-muted-foreground text-sm mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              {property.address}, {property.neighborhood ? `${property.neighborhood}, ` : ''}{property.city}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation(`/portafolio/${propertyId}/editar`)}>
              <Edit className="h-4 w-4 mr-2" /> Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar propiedad?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminarán todos los datos financieros y notas asociadas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Gallery */}
            {images.length > 0 ? (
              <div className="space-y-2">
                {/* Hero image */}
                <div
                  className="aspect-video bg-muted rounded-lg overflow-hidden cursor-zoom-in"
                  onClick={() => setLightboxIndex(0)}
                >
                  <img
                    src={`/api/storage${images[0]}`}
                    alt={property.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                {/* Thumbnail strip */}
                {images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {images.slice(1).map((img, i) => (
                      <div
                        key={i}
                        className="aspect-square bg-muted rounded-lg overflow-hidden cursor-zoom-in relative group"
                        onClick={() => setLightboxIndex(i + 1)}
                      >
                        <img
                          src={`/api/storage${img}`}
                          alt={`${property.title} ${i + 2}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* "Ver más" overlay on last thumbnail when there are many */}
                        {i === 2 && images.length > 4 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">+{images.length - 4} más</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {images.length > 1 && (
                  <p className="text-xs text-muted-foreground text-right">
                    Toca cualquier foto para verla en pantalla completa
                  </p>
                )}
              </div>
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                Sin imagen
              </div>
            )}

            <Card>
              <CardHeader><CardTitle>Detalles</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-md"><HomeIcon className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="font-medium capitalize">{property.propertyType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-md"><TrendingUp className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <p className="font-medium capitalize">{property.status.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 col-span-2">
                  <div className={`p-2 rounded-md ${inspStatus === "overdue" ? "bg-red-100" : inspStatus === "soon" ? "bg-orange-100" : "bg-primary/10"}`}>
                    <Calendar className={`h-5 w-5 ${inspStatus === "overdue" ? "text-red-600" : inspStatus === "soon" ? "text-orange-500" : "text-primary"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Próxima Inspección</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {inspDate ? inspDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No programada'}
                      </p>
                      {inspStatus === "overdue" && <Badge variant="destructive" className="text-[10px]">Vencida</Badge>}
                      {inspStatus === "soon" && <Badge className="text-[10px] bg-orange-500 hover:bg-orange-600">Próxima</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Occupancy Section */}
            <Card>
              <CardHeader><CardTitle>Ocupación</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Tasa de ocupación actual</span>
                    <span className="font-bold">{property.occupancyRate != null ? `${property.occupancyRate}%` : "N/A"}</span>
                  </div>
                  <Progress
                    value={property.occupancyRate ?? 0}
                    className="h-3"
                  />
                  <p className="text-xs text-muted-foreground">
                    {property.occupancyRate == null
                      ? "Sin datos de ocupación registrados."
                      : property.occupancyRate >= 90
                      ? "Excelente ocupación — por encima del promedio del mercado."
                      : property.occupancyRate >= 70
                      ? "Ocupación moderada — considera estrategias de retención."
                      : "Ocupación baja — revisa el precio de renta y condiciones."}
                  </p>
                </div>
                {property.rentAmount && (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="bg-emerald-100 p-2 rounded-md">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Renta mensual</p>
                      <p className="font-bold text-emerald-600">{formatCurrency(property.rentAmount)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="bg-secondary/50 pb-4">
                <CardTitle>Finanzas</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Precio de Compra</span>
                  <span className="font-medium">{formatCurrency(property.purchasePrice)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Valor Actual</span>
                  <span className="font-bold text-lg">{formatCurrency(property.currentValue)}</span>
                </div>
                {property.currentValue && property.purchasePrice && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Plusvalía</span>
                    <span className={`font-semibold ${property.currentValue >= property.purchasePrice ? "text-emerald-600" : "text-destructive"}`}>
                      {property.currentValue >= property.purchasePrice ? "+" : ""}
                      {(((property.currentValue - property.purchasePrice) / property.purchasePrice) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Renta Mensual</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(property.rentAmount)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Gastos Mensuales</span>
                  <span className="font-medium text-destructive">{formatCurrency(property.expensesMonthly)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground font-medium">Ingreso Neto (NOI)</span>
                  <span className="font-bold">{formatCurrency(property.netIncome)}</span>
                </div>
                <div className="bg-primary/10 p-4 rounded-lg mt-4 text-center">
                  <p className="text-sm text-primary font-semibold uppercase tracking-wider">Cap Rate Estimado</p>
                  <p className="text-3xl font-bold text-primary mt-1">{capRate}{capRate !== 'N/A' && '%'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

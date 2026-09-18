import { useGetZone, useGetZoneNote, useUpsertZoneNote } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, TrendingUp, DollarSign, MapPin, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ZoneDetail() {
  const { id } = useParams<{ id: string }>();
  const zoneId = parseInt(id, 10);
  const { toast } = useToast();

  const { data: zone, isLoading: zoneLoading } = useGetZone(zoneId, { 
    query: { enabled: !isNaN(zoneId), queryKey: ['getZone', zoneId] as any } 
  });

  const { data: note, isLoading: noteLoading } = useGetZoneNote(zoneId, { 
    query: { enabled: !isNaN(zoneId), queryKey: ['getZoneNote', zoneId] as any } 
  });

  const upsertNoteMutation = useUpsertZoneNote();
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    if (note) {
      setNoteContent(note.content);
    }
  }, [note]);

  const handleSaveNote = () => {
    upsertNoteMutation.mutate({ zoneId, data: { content: noteContent } }, {
      onSuccess: () => {
        toast({ title: "Notas guardadas exitosamente" });
      },
      onError: () => {
        toast({ title: "Error al guardar notas", variant: "destructive" });
      }
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
  };

  if (zoneLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!zone) return <div className="p-8 text-center">Zona no encontrada</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/zonas">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{zone.name}</h1>
          <div className="flex items-center text-muted-foreground text-sm mt-1">
            <MapPin className="h-4 w-4 mr-1" />
            {zone.city}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
             <Card>
               <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1 h-full">
                 <DollarSign className="h-6 w-6 text-muted-foreground mb-2" />
                 <p className="text-xs text-muted-foreground uppercase font-semibold">Precio / m²</p>
                 <p className="text-xl font-bold">{formatCurrency(zone.pricePerM2)}</p>
               </CardContent>
             </Card>
             <Card>
               <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1 h-full">
                 <TrendingUp className="h-6 w-6 text-primary mb-2" />
                 <p className="text-xs text-muted-foreground uppercase font-semibold">Crecimiento Anual</p>
                 <p className="text-xl font-bold text-primary">+{zone.annualGrowthPct}%</p>
               </CardContent>
             </Card>
             <Card className="col-span-2 sm:col-span-1">
               <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1 h-full bg-secondary/30">
                 <div className="h-6 w-6 rounded-full border-2 border-emerald-500 flex items-center justify-center mb-2">
                   <span className="text-[10px] font-bold text-emerald-600">%</span>
                 </div>
                 <p className="text-xs text-muted-foreground uppercase font-semibold">Cap Rate Promedio</p>
                 <p className="text-xl font-bold text-emerald-600">{zone.rentalYieldPct}%</p>
               </CardContent>
             </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Análisis de Mercado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {zone.description || "No hay un análisis detallado disponible para esta zona aún."}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="bg-secondary/50 pb-4">
              <CardTitle className="text-lg">Notas Personales (Due Diligence)</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col pt-4 space-y-4">
              {noteLoading ? (
                <Skeleton className="h-full min-h-[200px] w-full" />
              ) : (
                <>
                  <Textarea 
                    placeholder="Anota observaciones de campo, contactos de brokers, precios de referencia..."
                    className="flex-1 min-h-[250px] resize-none"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                  />
                  <Button 
                    className="w-full" 
                    onClick={handleSaveNote}
                    disabled={upsertNoteMutation.isPending || noteContent === note?.content}
                  >
                    {upsertNoteMutation.isPending ? "Guardando..." : "Guardar Notas"} <Check className="ml-2 h-4 w-4" />
                  </Button>
                  {note && <p className="text-xs text-center text-muted-foreground">Última actualización: {new Date(note.updatedAt).toLocaleString()}</p>}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

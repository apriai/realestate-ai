import { useListZones } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MapPin, TrendingUp, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useState } from "react";

export default function Zones() {
  const [search, setSearch] = useState("");
  const { data: zones, isLoading } = useListZones();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inteligencia de Zonas</h1>
          <p className="text-muted-foreground">Datos macroeconómicos de zonas de inversión.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar ciudad o colonia..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
             <Card key={i}>
               <CardHeader className="pb-2">
                 <Skeleton className="h-6 w-3/4" />
                 <Skeleton className="h-4 w-1/2 mt-1" />
               </CardHeader>
               <CardContent>
                 <div className="space-y-3 mt-4">
                   <Skeleton className="h-8 w-full" />
                   <Skeleton className="h-8 w-full" />
                 </div>
               </CardContent>
             </Card>
          ))
        ) : zones?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No se encontraron zonas que coincidan con la búsqueda.
          </div>
        ) : (
          zones?.map((zone) => (
            <Link key={zone.id} href={`/zona/${zone.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-start">
                    <span className="line-clamp-1">{zone.name}</span>
                  </CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 mr-1" /> {zone.city}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-secondary/50 p-3 rounded-lg">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <DollarSign className="h-3.5 w-3.5" /> Precio / m²
                      </div>
                      <span className="font-bold text-foreground">{formatCurrency(zone.pricePerM2)}</span>
                    </div>
                    <div className="bg-secondary/50 p-3 rounded-lg">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <TrendingUp className="h-3.5 w-3.5" /> Rendimiento
                      </div>
                      <span className="font-bold text-emerald-600">{zone.rentalYieldPct}%</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Crecimiento anual</span>
                    <span className="font-medium text-primary">+{zone.annualGrowthPct}%</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

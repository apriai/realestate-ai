import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useListPublicProjects } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingUp, ArrowRight } from "lucide-react";

export default function Invest() {
  const { data: projects, isLoading } = useListPublicProjects();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/30">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">RealEstate <span className="text-primary">AI</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/iniciar-sesion">
              <Button variant="ghost" className="hidden sm:flex font-semibold">Iniciar Sesión</Button>
            </Link>
            <Link href="/registro">
              <Button className="font-semibold shadow-md">Crear Cuenta</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 lg:py-32 overflow-hidden border-b">
          <div className="absolute inset-0 bg-secondary/50 -z-10" />
          <div className="container mx-auto px-4 text-center max-w-4xl">
            <Badge variant="outline" className="mb-6 border-primary/50 text-primary py-1 px-4 text-sm font-semibold uppercase tracking-widest">
              Club de Inversores
            </Badge>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
              Invierte con <br/><span className="text-primary">Precisión Algorítmica</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Accede a desarrollos inmobiliarios en México validados por inteligencia artificial. Rendimientos proyectados superiores al mercado tradicional con total transparencia.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/registro">
                <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 shadow-xl">
                  Ver Oportunidades <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Public Projects Showcase */}
        <section className="py-24 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Desarrollos Activos</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Oportunidades de inversión curadas y abiertas para fondeo. Crea una cuenta para ver el análisis financiero completo.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {isLoading ? (
                <div className="col-span-full text-center text-muted-foreground">Cargando oportunidades...</div>
              ) : projects?.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground border border-dashed rounded-xl">
                  No hay proyectos públicos disponibles en este momento.
                </div>
              ) : (
                projects?.map((project) => (
                  <Card key={project.id} className="overflow-hidden border-border shadow-md hover:shadow-xl transition-all group flex flex-col">
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {project.images?.[0] ? (
                        <img 
                          src={`/api/storage${project.images[0]}`} 
                          alt={project.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                        />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center bg-secondary">
                           <Building2 className="h-12 w-12 text-muted-foreground/30" />
                         </div>
                      )}
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-background/90 text-foreground backdrop-blur border-0 font-bold shadow-sm">
                          {project.type}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-6 flex flex-col flex-1">
                      <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                      <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{project.location}</p>
                      
                      <div className="mt-auto space-y-4 pt-6 border-t">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Inversión Total</p>
                            <p className="font-bold">{formatCurrency(project.totalInvestment || 0)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1 flex items-center justify-end gap-1"><TrendingUp className="h-3 w-3 text-primary"/> ROI Est.</p>
                            <p className="font-bold text-primary">{project.roiEstimated}%</p>
                          </div>
                        </div>
                        <Link href={`/registro?redirect=/proyectos/${project.id}`}>
                          <Button className="w-full" size="sm">
                            Quiero Invertir <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="text-center mt-12">
              <Link href="/registro">
                <Button variant="outline" size="lg" className="border-primary/20 hover:bg-primary/5">
                  Ver todos los desarrollos
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card py-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} RealEstate AI. Plataforma para inversores calificados.</p>
        </div>
      </footer>
    </div>
  );
}

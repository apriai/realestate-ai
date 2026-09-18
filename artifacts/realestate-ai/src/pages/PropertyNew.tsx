import { useState, useRef } from "react";
import { useCreateProperty, useRequestUploadUrl } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, UploadCloud } from "lucide-react";

const PROPERTY_TYPES = [
  { value: "casa", label: "Casa" },
  { value: "depa", label: "Departamento" },
  { value: "local", label: "Local Comercial" },
  { value: "terreno", label: "Terreno" },
];

const STATUSES = [
  { value: "activa", label: "Activa (Rentada/Uso)" },
  { value: "vendida", label: "Vendida" },
  { value: "en_rehab", label: "En Rehabilitación (Fix & Flip)" },
];

export default function PropertyNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createMutation = useCreateProperty();
  const requestUploadUrl = useRequestUploadUrl();

  const [formData, setFormData] = useState({
    title: "",
    propertyType: "casa" as any,
    status: "activa" as any,
    address: "",
    city: "",
    neighborhood: "",
    purchasePrice: 0,
    currentValue: 0,
    rentAmount: 0,
    expensesMonthly: 0,
    isPublic: false,
    images: [] as string[],
    nextInspectionDate: "" as string,
  });

  const handleNext = () => setStep(s => Math.min(s + 1, 5));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    const uploadedPaths: string[] = [];
    for (const file of files) {
      try {
        const urlResp = await requestUploadUrl.mutateAsync({
          data: { fileName: file.name, size: file.size, contentType: file.type }
        });
        await fetch(urlResp.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        await fetch("/api/storage/uploads/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectPath: urlResp.objectPath }),
        });
        uploadedPaths.push(urlResp.objectPath);
      } catch {
        toast({ title: `Error subiendo ${file.name}`, variant: "destructive" });
      }
    }
    setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedPaths] }));
    setUploading(false);
    if (uploadedPaths.length) toast({ title: `${uploadedPaths.length} imagen(es) subida(s)` });
  };

  const handleSubmit = () => {
    const submitData: any = { ...formData };
    if (!submitData.nextInspectionDate) delete submitData.nextInspectionDate;
    createMutation.mutate({ data: submitData }, {
      onSuccess: (property) => {
        toast({ title: "Propiedad agregada exitosamente" });
        setLocation(`/portafolio/${property.id}`);
      },
      onError: () => {
        toast({ title: "Error al agregar propiedad", variant: "destructive" });
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/portafolio">
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-2xl font-bold">Agregar Propiedad</h1>
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          Paso {step} de 5
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`h-2 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-secondary'}`} />
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Información Básica</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título / Identificador</Label>
                  <Input 
                    id="title" 
                    placeholder="Ej. Depa Roma Norte 202"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Propiedad</Label>
                  <Select value={formData.propertyType} onValueChange={v => setFormData({ ...formData, propertyType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado Actual</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Ubicación</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección Completa</Label>
                  <Input 
                    id="address" 
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input 
                      id="city" 
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Colonia</Label>
                    <Input 
                      id="neighborhood" 
                      value={formData.neighborhood}
                      onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Datos Financieros</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Precio de Compra (MXN)</Label>
                  <Input 
                    id="purchasePrice" 
                    type="number"
                    value={formData.purchasePrice || ''}
                    onChange={e => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentValue">Valor Actual Estimado (MXN)</Label>
                  <Input 
                    id="currentValue" 
                    type="number"
                    value={formData.currentValue || ''}
                    onChange={e => setFormData({ ...formData, currentValue: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rentAmount">Renta Mensual (MXN)</Label>
                  <Input 
                    id="rentAmount" 
                    type="number"
                    value={formData.rentAmount || ''}
                    onChange={e => setFormData({ ...formData, rentAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expensesMonthly">Gastos Mensuales (MXN)</Label>
                  <Input 
                    id="expensesMonthly" 
                    type="number"
                    value={formData.expensesMonthly || ''}
                    onChange={e => setFormData({ ...formData, expensesMonthly: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="nextInspectionDate">Próxima Inspección</Label>
                  <Input 
                    id="nextInspectionDate" 
                    type="date"
                    value={formData.nextInspectionDate || ''}
                    onChange={e => setFormData({ ...formData, nextInspectionDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Opcional: fecha programada para inspección física de la propiedad.</p>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Imágenes</h2>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
              />
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center space-y-4 cursor-pointer transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'hover:bg-secondary/30'}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")));
                }}
              >
                <UploadCloud className={`h-10 w-10 mx-auto ${uploading ? 'text-primary animate-pulse' : dragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-sm text-muted-foreground">
                  {uploading ? "Subiendo imágenes..." : dragOver ? "Suelta las imágenes aquí" : "Arrastra imágenes aquí o haz clic para seleccionar"}
                </p>
                <Button variant="secondary" type="button" disabled={uploading} onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  Seleccionar Imágenes
                </Button>
              </div>
              {formData.images.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-emerald-600">{formData.images.length} imagen(es) lista(s)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {formData.images.map((path, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-muted border">
                        <img
                          src={`/api/storage${path}`}
                          alt={`Imagen ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) })); }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Revisión y Publicación</h2>
              <div className="bg-secondary/50 p-4 rounded-lg space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Título</span>
                  <span className="font-medium">{formData.title || '-'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Ubicación</span>
                  <span className="font-medium">{formData.address}, {formData.city}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Precio Compra</span>
                  <span className="font-medium">${formData.purchasePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-muted-foreground">Fotos</span>
                  <span className={`font-medium ${formData.images.length > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {formData.images.length > 0 ? `${formData.images.length} imagen(es)` : 'Sin fotos'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Hacer pública para inversores</Label>
                  <p className="text-xs text-muted-foreground">La propiedad será visible en la sección de inversiones.</p>
                </div>
                <Switch checked={formData.isPublic} onCheckedChange={c => setFormData({ ...formData, isPublic: c })} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handlePrev} disabled={step === 1}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
        </Button>
        {step < 5 ? (
          <Button onClick={handleNext} disabled={!formData.title && step === 1}>
            Siguiente <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Guardando..." : "Guardar Propiedad"} <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

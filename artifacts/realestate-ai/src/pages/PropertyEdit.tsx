import { useState, useRef, useEffect } from "react";
import { useGetProperty, useUpdateProperty, useRequestUploadUrl } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useLocation, Link } from "wouter";
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

export default function PropertyEdit() {
  const { id } = useParams<{ id: string }>();
  const propertyId = parseInt(id, 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateMutation = useUpdateProperty();
  const requestUploadUrl = useRequestUploadUrl();

  const { data: property, isLoading } = useGetProperty(propertyId, {
    query: { enabled: !isNaN(propertyId), queryKey: ["getProperty", propertyId] as any },
  });

  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    propertyType: "casa" as string,
    status: "activa" as string,
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

  useEffect(() => {
    if (property && !initialized) {
      setFormData({
        title: property.title ?? "",
        propertyType: property.propertyType ?? "casa",
        status: property.status ?? "activa",
        address: property.address ?? "",
        city: property.city ?? "",
        neighborhood: property.neighborhood ?? "",
        purchasePrice: property.purchasePrice ?? 0,
        currentValue: property.currentValue ?? 0,
        rentAmount: property.rentAmount ?? 0,
        expensesMonthly: property.expensesMonthly ?? 0,
        isPublic: property.isPublic ?? false,
        images: property.images ?? [],
        nextInspectionDate: property.nextInspectionDate
          ? property.nextInspectionDate.slice(0, 10)
          : "",
      });
      setInitialized(true);
    }
  }, [property, initialized]);

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    const uploadedPaths: string[] = [];
    for (const file of files) {
      try {
        const urlResp = await requestUploadUrl.mutateAsync({
          data: { fileName: file.name, size: file.size, contentType: file.type },
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
    updateMutation.mutate(
      { id: propertyId, data: submitData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["getProperty", propertyId] });
          queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
          toast({ title: "Propiedad actualizada" });
          setLocation(`/portafolio/${propertyId}`);
        },
        onError: () => {
          toast({ title: "Error al actualizar", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!property) {
    return <div className="p-8 text-center">Propiedad no encontrada</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/portafolio/${propertyId}`}>
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Editar Propiedad</h1>
            <p className="text-sm text-muted-foreground truncate max-w-xs">{property.title}</p>
          </div>
        </div>
        <div className="text-sm font-medium text-muted-foreground">Paso {step} de 5</div>
      </div>

      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-secondary"}`} />
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Step 1 — Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Información Básica</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título / Identificador</Label>
                  <Input
                    id="title"
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

          {/* Step 2 — Location */}
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

          {/* Step 3 — Financials */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Datos Financieros</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: "purchasePrice", label: "Precio de Compra (MXN)", key: "purchasePrice" as const },
                  { id: "currentValue", label: "Valor Actual Estimado (MXN)", key: "currentValue" as const },
                  { id: "rentAmount", label: "Renta Mensual (MXN)", key: "rentAmount" as const },
                  { id: "expensesMonthly", label: "Gastos Mensuales (MXN)", key: "expensesMonthly" as const },
                ].map(field => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>{field.label}</Label>
                    <Input
                      id={field.id}
                      type="number"
                      value={formData[field.key] || ""}
                      onChange={e => setFormData({ ...formData, [field.key]: Number(e.target.value) })}
                    />
                  </div>
                ))}
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="nextInspectionDate">Próxima Inspección</Label>
                  <Input
                    id="nextInspectionDate"
                    type="date"
                    value={formData.nextInspectionDate || ""}
                    onChange={e => setFormData({ ...formData, nextInspectionDate: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Opcional: fecha programada para inspección física.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Photos */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Fotos</h2>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => handleFiles(Array.from(e.target.files ?? []))}
              />
              <div
                className={`border-2 border-dashed rounded-lg p-10 text-center space-y-4 cursor-pointer transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "hover:bg-secondary/30"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")));
                }}
              >
                <UploadCloud
                  className={`h-10 w-10 mx-auto ${
                    uploading ? "text-primary animate-pulse" : dragOver ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <p className="text-sm text-muted-foreground">
                  {uploading
                    ? "Subiendo imágenes..."
                    : dragOver
                    ? "Suelta las imágenes aquí"
                    : "Arrastra imágenes aquí o haz clic para agregar más"}
                </p>
                <Button
                  variant="secondary"
                  type="button"
                  size="sm"
                  disabled={uploading}
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  Agregar imágenes
                </Button>
              </div>

              {formData.images.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    {formData.images.length} imagen(es) — haz clic en × para eliminar
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {formData.images.map((path, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-muted border">
                        <img
                          src={`/api/storage${path}`}
                          alt={`Foto ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                          onClick={e => {
                            e.stopPropagation();
                            setFormData(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }));
                          }}
                        >
                          ×
                        </button>
                        {i === 0 && (
                          <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                            Principal
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">Sin fotos — agrega al menos una para mejorar tu listado.</p>
              )}
            </div>
          )}

          {/* Step 5 — Review */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Confirmar Cambios</h2>
              <div className="bg-secondary/50 p-4 rounded-lg space-y-3 text-sm">
                {[
                  { label: "Título", value: formData.title || "—" },
                  { label: "Tipo", value: PROPERTY_TYPES.find(t => t.value === formData.propertyType)?.label ?? formData.propertyType },
                  { label: "Ubicación", value: [formData.address, formData.city].filter(Boolean).join(", ") || "—" },
                  { label: "Precio de Compra", value: formData.purchasePrice ? `$${formData.purchasePrice.toLocaleString()} MXN` : "—" },
                  { label: "Valor Actual", value: formData.currentValue ? `$${formData.currentValue.toLocaleString()} MXN` : "—" },
                  {
                    label: "Fotos",
                    value: formData.images.length > 0 ? `${formData.images.length} imagen(es)` : "Sin fotos",
                    highlight: formData.images.length > 0,
                  },
                ].map((row, i, arr) => (
                  <div key={row.label} className={`flex justify-between ${i < arr.length - 1 ? "border-b pb-2" : ""}`}>
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={`font-medium ${row.highlight ? "text-emerald-600" : ""}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Visible para inversores</Label>
                  <p className="text-xs text-muted-foreground">La propiedad aparecerá en la sección de inversiones.</p>
                </div>
                <Switch
                  checked={formData.isPublic}
                  onCheckedChange={c => setFormData({ ...formData, isPublic: c })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => setStep(s => Math.max(s - 1, 1))} disabled={step === 1}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
        </Button>
        {step < 5 ? (
          <Button onClick={() => setStep(s => Math.min(s + 1, 5))}>
            Siguiente <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}{" "}
            <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

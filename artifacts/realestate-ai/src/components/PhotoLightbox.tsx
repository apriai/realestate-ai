import { useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface PhotoLightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function PhotoLightbox({ images, currentIndex, onClose, onNavigate }: PhotoLightboxProps) {
  const total = images.length;

  const goPrev = useCallback(() => {
    onNavigate((currentIndex - 1 + total) % total);
  }, [currentIndex, total, onNavigate]);

  const goNext = useCallback(() => {
    onNavigate((currentIndex + 1) % total);
  }, [currentIndex, total, onNavigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goPrev, goNext]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Galería de fotos"
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        onClick={onClose}
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium tabular-nums select-none">
        {currentIndex + 1} / {total}
      </div>

      {/* Prev arrow */}
      {total > 1 && (
        <button
          className="absolute left-3 md:left-6 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          onClick={e => { e.stopPropagation(); goPrev(); }}
          aria-label="Foto anterior"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Main image */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        <img
          key={currentIndex}
          src={`/api/storage${images[currentIndex]}`}
          alt={`Foto ${currentIndex + 1}`}
          className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl select-none"
          draggable={false}
        />
      </div>

      {/* Next arrow */}
      {total > 1 && (
        <button
          className="absolute right-3 md:right-6 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          onClick={e => { e.stopPropagation(); goNext(); }}
          aria-label="Foto siguiente"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Thumbnail strip (only when >1 image) */}
      {total > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-4 overflow-x-auto max-w-[90vw]"
          onClick={e => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              className={`flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                i === currentIndex
                  ? "border-white opacity-100 scale-110"
                  : "border-transparent opacity-50 hover:opacity-80"
              }`}
              aria-label={`Ver foto ${i + 1}`}
            >
              <img
                src={`/api/storage${img}`}
                alt={`Miniatura ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

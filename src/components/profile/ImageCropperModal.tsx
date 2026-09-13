import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ZoomIn, ZoomOut, RotateCw, RefreshCw } from 'lucide-react';
import { cropAndCompressImage } from '../../lib/imageUtils';
import { triggerHaptic } from '../../lib/haptics';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => Promise<void> | void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset adjustments whenever imageSrc changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  // Handle Drag / Pan (Mouse & Touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.min(3, Math.max(1, newZoom));
    setZoom(clamped);
    triggerHaptic('tap');
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    triggerHaptic('selection');
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    triggerHaptic('tap');
  };

  const handleSave = useCallback(async () => {
    if (!imageSrc || !imgRef.current) return;
    setIsProcessing(true);
    triggerHaptic('completion');

    try {
      // Calculate crop rect based on circular viewfinder & image transformation
      const img = imgRef.current;
      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;

      // Draw the transformed image to an offscreen canvas
      const canvas = document.createElement('canvas');
      const size = 400; // high res square output
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Center origin
        ctx.translate(size / 2, size / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);

        // Map pan coordinates from viewport (280px) to export (400px)
        const scaleFactor = size / 280;
        ctx.translate(position.x * scaleFactor, position.y * scaleFactor);

        // Draw image centered
        const aspect = naturalW / naturalH;
        let drawW = size;
        let drawH = size;
        if (aspect > 1) {
          drawW = size * aspect;
        } else {
          drawH = size / aspect;
        }

        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

        // Compress to efficient WebP or JPEG
        let dataUrl: string;
        try {
          dataUrl = canvas.toDataURL('image/webp', 0.85);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          }
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        }

        await onCropComplete(dataUrl);
      }
    } catch (err) {
      console.error('Failed to crop image:', err);
    } finally {
      setIsProcessing(false);
      onClose();
    }
  }, [imageSrc, zoom, rotation, position, onCropComplete, onClose]);

  if (!isOpen || !imageSrc) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm bg-surface-card border border-[#222733] rounded-[28px] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h3 className="text-base font-semibold text-white tracking-tight">Adjust Photo</h3>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="px-5 text-xs text-[#7d8495] mb-3">
            Drag to reposition. Pinch or use the slider to zoom.
          </p>

          {/* Viewfinder Canvas Area */}
          <div className="relative w-full aspect-square max-w-[280px] mx-auto bg-[#0a0b0e] rounded-full overflow-hidden border-2 border-accent-primary/30 shadow-inner flex items-center justify-center select-none touch-none">
            {/* Draggable & Scalable Image */}
            <div
              ref={containerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop Target"
                draggable={false}
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  maxHeight: '100%',
                  maxWidth: '100%',
                  objectFit: 'contain',
                }}
                className="pointer-events-none select-none transition-transform duration-75 ease-out"
              />
            </div>

            {/* Circular Vignette Overlay */}
            <div className="absolute inset-0 rounded-full pointer-events-none border border-white/20 shadow-[inset_0_0_30px_rgba(0,0,0,0.6)]" />
          </div>

          {/* Controls */}
          <div className="p-5 space-y-4">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3 bg-background px-3.5 py-2.5 rounded-2xl border border-white/5">
              <button
                type="button"
                onClick={() => handleZoomChange(zoom - 0.2)}
                className="p-1 text-[#7d8495] hover:text-white cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="flex-1 accent-accent-primary cursor-pointer"
              />
              <button
                type="button"
                onClick={() => handleZoomChange(zoom + 0.2)}
                className="p-1 text-[#7d8495] hover:text-white cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Rotation & Reset Row */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRotate}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-white/80 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-white/80 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-sm font-medium text-[#7d8495] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 rounded-2xl bg-accent-primary hover:bg-[#9eff38] active:scale-95 text-black font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(140,238,40,0.25)]"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Apply Photo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default ImageCropperModal;

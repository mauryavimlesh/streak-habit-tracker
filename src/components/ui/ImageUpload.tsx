import React, { useRef, useState, DragEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Image as ImageIcon,
  X,
  AlertCircle,
  Plus,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  Loader2,
} from 'lucide-react';
import { compressImageFile } from '../../lib/imageUtils';
import { triggerHaptic } from '../../lib/haptics';
import { cn } from '../../lib/utils';

export interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  maxSizeMb?: number;
  label?: string;
  description?: string;
  allowMultiple?: boolean;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onChange,
  maxImages = 4,
  maxSizeMb = 10,
  label = 'Add photos',
  description,
  allowMultiple = true,
  compact = false,
  disabled = false,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0 || disabled) return;
    setErrorMsg(null);
    setIsProcessing(true);

    const newImages: string[] = allowMultiple ? [...images] : [];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
    const fileList = Array.from(files);

    try {
      for (const file of fileList) {
        if (allowMultiple && newImages.length >= maxImages) {
          setErrorMsg(`Maximum ${maxImages} ${maxImages === 1 ? 'image' : 'images'} allowed.`);
          break;
        }

        if (!allowedTypes.includes(file.type.toLowerCase())) {
          setErrorMsg('Unsupported format. Please upload JPG, PNG, or WebP images.');
          continue;
        }

        if (file.size > maxSizeMb * 1024 * 1024) {
          setErrorMsg(`File "${file.name}" exceeds the ${maxSizeMb}MB limit.`);
          continue;
        }

        try {
          const compressed = await compressImageFile(file, 1400, 0.82);
          if (!allowMultiple) {
            newImages.length = 0;
            newImages.push(compressed);
            break;
          } else {
            newImages.push(compressed);
          }
        } catch (err) {
          console.error('Error compressing image:', err);
          setErrorMsg('Failed to process image. Please try another.');
        }
      }

      triggerHaptic('completion');
      onChange(newImages);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = (index: number) => {
    triggerHaptic('light');
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
    if (previewIndex !== null) {
      if (updated.length === 0) {
        setPreviewIndex(null);
      } else if (previewIndex >= updated.length) {
        setPreviewIndex(updated.length - 1);
      }
    }
  };

  const handleClearAll = () => {
    triggerHaptic('selection');
    onChange([]);
    setPreviewIndex(null);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const currentPreviewImage =
    previewIndex !== null && images[previewIndex] ? images[previewIndex] : null;

  return (
    <div className={cn('space-y-2.5', className)}>
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        multiple={allowMultiple}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files) {
            processFiles(e.target.files);
          }
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files) {
            processFiles(e.target.files);
          }
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Error Alert */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-red-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thumbnail Gallery & Controls */}
      <div className="space-y-2">
        {/* Top Info Bar if images exist */}
        {images.length > 0 && (
          <div className="flex items-center justify-between text-[11px] text-[#7d8495] px-0.5">
            <span>
              {images.length} of {maxImages} {images.length === 1 ? 'photo' : 'photos'} attached
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[#7d8495] hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remove all</span>
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Thumbnails */}
          {images.map((img, idx) => (
            <motion.div
              key={idx}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              className="relative group rounded-2xl overflow-hidden border border-white/10 bg-[#0e1015] aspect-square w-20 h-20 shrink-0 shadow-sm"
            >
              <img
                src={img}
                alt={`Uploaded ${idx + 1}`}
                className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                onClick={() => setPreviewIndex(idx)}
              />

              {/* View full overlay trigger */}
              <button
                type="button"
                onClick={() => setPreviewIndex(idx)}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                title="Preview image"
              >
                <Eye className="w-5 h-5 drop-shadow-md" />
              </button>

              {/* Delete button badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(idx);
                }}
                disabled={disabled}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 hover:bg-red-500 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md border border-white/10 z-10"
                title="Remove photo"
                aria-label={`Remove photo ${idx + 1}`}
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              {/* Position pill */}
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-white/90 pointer-events-none">
                {idx + 1}
              </span>
            </motion.div>
          ))}

          {/* Add / Dropzone Trigger */}
          {images.length < maxImages && !disabled && (
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                triggerHaptic('tap');
                setShowOptions(true);
              }}
              className={cn(
                'rounded-2xl border border-dashed transition-all flex flex-col items-center justify-center cursor-pointer select-none',
                isDragging
                  ? 'border-accent-primary bg-accent-primary/15 scale-102'
                  : 'border-white/20 hover:border-accent-primary/50 bg-white/5 hover:bg-white/10',
                compact || images.length > 0
                  ? 'w-20 h-20 shrink-0 gap-1'
                  : 'w-full py-4 px-4 gap-1.5'
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 text-accent-primary animate-spin" />
                  <span className="text-[10px] text-accent-primary font-medium">Compressing...</span>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-xl bg-accent-primary/15 text-accent-primary flex items-center justify-center">
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </div>
                  <span className="text-[11px] font-semibold text-white/90 text-center leading-tight">
                    {compact || images.length > 0 ? label : `Upload or drop ${label.toLowerCase()}`}
                  </span>
                  {!compact && images.length === 0 && (
                    <span className="text-[10px] text-[#7d8495] text-center">
                      {description || `PNG, JPG or WebP up to ${maxSizeMb}MB`}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Source Choice Modal (Gallery / File Picker vs Camera) */}
      <AnimatePresence>
        {showOptions && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOptions(false)}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="relative w-full max-w-sm bg-surface-card border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 space-y-3 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Add Photos
                  </h4>
                  <p className="text-[11px] text-[#7d8495]">Select upload source</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOptions(false)}
                  className="p-1 rounded-full text-[#7d8495] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowOptions(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-3 transition-colors cursor-pointer border border-white/5"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-white font-semibold">Choose from Gallery / Files</div>
                    <div className="text-[10px] text-[#7d8495]">Select one or multiple images</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowOptions(false);
                    cameraInputRef.current?.click();
                  }}
                  className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-3 transition-colors cursor-pointer border border-white/5"
                >
                  <div className="w-8 h-8 rounded-xl bg-accent-primary/20 text-accent-primary flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-white font-semibold">Take Photo with Camera</div>
                    <div className="text-[10px] text-[#7d8495]">Capture directly from device</div>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full-Screen Lightbox / Preview Modal */}
      <AnimatePresence>
        {currentPreviewImage && previewIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewIndex(null)}
              className="absolute inset-0"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-lg max-h-[85vh] w-full flex flex-col items-center justify-center z-10"
            >
              {/* Image View */}
              <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black/50 max-h-[75vh]">
                <img
                  src={currentPreviewImage}
                  alt={`Preview ${previewIndex + 1}`}
                  className="max-w-full max-h-[75vh] object-contain"
                />

                {/* Counter & Action overlay header */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto">
                  <span className="px-2.5 py-1 rounded-full bg-black/75 text-xs font-semibold text-white/90 border border-white/10">
                    {previewIndex + 1} / {images.length}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRemove(previewIndex)}
                      className="w-8 h-8 rounded-full bg-black/80 hover:bg-red-500 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                      title="Delete photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(null)}
                      className="w-8 h-8 rounded-full bg-black/80 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                      title="Close preview"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Prev / Next navigation if multiple images */}
              {images.length > 1 && (
                <div className="flex items-center justify-center gap-4 mt-3 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      setPreviewIndex((prev) =>
                        prev === null || prev === 0 ? images.length - 1 : prev - 1
                      );
                    }}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                    title="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPreviewIndex(i)}
                        className={cn(
                          'w-2.5 h-2.5 rounded-full transition-all cursor-pointer',
                          previewIndex === i ? 'bg-accent-primary w-5' : 'bg-white/30'
                        )}
                        title={`Go to photo ${i + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      setPreviewIndex((prev) =>
                        prev === null || prev === images.length - 1 ? 0 : prev + 1
                      );
                    }}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                    title="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageUpload;

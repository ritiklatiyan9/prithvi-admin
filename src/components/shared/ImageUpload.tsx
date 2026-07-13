import { useRef, useState, type DragEvent } from "react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

const MAX_SIZE_BYTES = 512 * 1024; // data-URL payloads must stay small
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");

interface ImageUploadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  className?: string;
}

/** Drag & drop / click-to-browse image picker; emits a base64 data URL. */
export const ImageUpload = ({
  value,
  onChange,
  label = "Upload image",
  className,
}: ImageUploadProps): JSX.Element => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readFile = (file: File): void => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only PNG, JPG, WebP, or GIF images are allowed");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Image (including animated GIF) must be smaller than 512 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) readFile(file);
  };

  return (
    <div className={className}>
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Preview"
            className="h-24 w-24 rounded-lg border object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
            onClick={() => onChange(null)}
          >
            <XMarkIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => event.key === "Enter" && inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:bg-muted/50",
            dragging && "border-primary bg-muted/50",
          )}
        >
          <PhotoIcon className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">Drag & drop or click · PNG/JPG/WebP/GIF · max 512 KB</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) readFile(file);
          event.target.value = "";
        }}
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
};

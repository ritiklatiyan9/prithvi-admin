import { useRef, useState } from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hotOffersService } from "@/services/hot-offers.service";
import { apiErrorMessage } from "@/services/api-client";

interface ImageUrlFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

/** URL input with an upload button — uploads to the backend and fills the URL. */
export const ImageUrlField = ({
  label,
  value,
  onChange,
  placeholder = "https://…",
}: ImageUrlFieldProps): JSX.Element => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File): Promise<void> => {
    setUploading(true);
    try {
      onChange(await hotOffersService.uploadImage(file));
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          title="Upload image"
        >
          <ArrowUpTrayIcon className="h-4 w-4" />
        </Button>
      </div>
      {value && (
        <img
          src={value}
          alt=""
          className="h-16 rounded-md border object-cover"
          onError={(event) => (event.currentTarget.style.display = "none")}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />
    </div>
  );
};

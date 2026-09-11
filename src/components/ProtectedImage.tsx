import { Lock, RefreshCw } from "lucide-react";
import type { CSSProperties } from "react";

import { usePhotoAccess } from "@/context/photoAccessContext";
import { useProtectedPhoto } from "@/hooks/useProtectedPhoto";
import { cn } from "@/lib/utils";

export interface ProtectedImageProps {
  /** Object path inside the private bucket, e.g. `wedding/primephoto-24.JPG`. */
  path: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  /** Sizing for the placeholder box; falls back to `className`. */
  placeholderClassName?: string;
  /**
   * Whether the placeholder itself opens the verification dialog. Set to false
   * when the image is already inside a link or button.
   */
  interactive?: boolean;
  loading?: "lazy" | "eager";
}

const boxClasses =
  "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted p-4 text-center";

/**
 * Renders a photograph only for verified visitors.
 *
 * In every other state it renders a neutral placeholder and never references
 * the underlying file, so the public HTML contains no photo URLs at all.
 */
const ProtectedImage = ({
  path,
  alt,
  className,
  style,
  placeholderClassName,
  interactive = true,
  loading = "lazy",
}: ProtectedImageProps) => {
  const { status, openDialog } = usePhotoAccess();
  const { url, state, retry } = useProtectedPhoto(path);

  const placeholderSizing = placeholderClassName ?? className;

  if (status === "verified" && state === "ready" && url) {
    return <img src={url} alt={alt} style={style} className={className} loading={loading} />;
  }

  if (status === "verified" && state === "loading") {
    return (
      <div
        style={style}
        className={cn(boxClasses, "animate-pulse", placeholderSizing)}
        aria-busy="true"
        aria-label={`Loading picture: ${alt}`}
        role="img"
      />
    );
  }

  if (status === "verified" && state === "error") {
    return (
      <div style={style} className={cn(boxClasses, placeholderSizing)}>
        <p className="text-xs text-muted-foreground">This picture could not be loaded.</p>
        <button
          type="button"
          onClick={retry}
          className="inline-flex items-center gap-1.5 text-xs text-accent underline underline-offset-4 hover:no-underline"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  const label = `View pictures to see: ${alt}`;

  if (!interactive) {
    return (
      <div
        style={style}
        className={cn(boxClasses, placeholderSizing)}
        role="img"
        aria-label={label}
      >
        <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs text-muted-foreground">Verify your email to view</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={openDialog}
      style={style}
      className={cn(
        boxClasses,
        "transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        placeholderSizing,
      )}
      aria-label={label}
    >
      <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="text-xs text-muted-foreground">View pictures</span>
    </button>
  );
};

export default ProtectedImage;

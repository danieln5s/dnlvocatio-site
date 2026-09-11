import { useEffect, useRef, useState } from "react";

import ProtectedImage from "@/components/ProtectedImage";

interface Props {
  /** Object path inside the private bucket, e.g. `cycling/happy_selfie.jpg`. */
  path: string;
  alt?: string;
  caption?: string;
  className?: string;
  /** 'cover' (default) will fill/crop to fit the area; 'contain' will preserve aspect and fit inside */
  fit?: "cover" | "contain";
  /** preserve original image dimensions (no fixed height) */
  preserve?: boolean;
}

const FadeInImage = ({ path, alt = "", caption, className = "", fit = "cover", preserve = false }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const DURATION = 2200; // ms, slower fade

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Toggle visibility based on intersection (enter => visible, exit => hidden)
          setVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transition: `opacity ${DURATION}ms ease, transform ${DURATION}ms ease` }}
      className={
        "w-full max-w-5xl mx-auto transition-opacity transition-transform " +
        (visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6") +
        (className ? ` ${className}` : "")
      }
    >
      <ProtectedImage
        path={path}
        alt={alt}
        style={preserve ? { width: "75%" } : undefined}
        className={
          `${preserve ? "mx-auto" : "w-full"} ${preserve ? "h-auto" : "h-[70vh]"} object-${fit} rounded-md`
        }
        placeholderClassName={
          `${preserve ? "mx-auto" : "w-full"} ${preserve ? "aspect-[3/2]" : "h-[70vh]"} rounded-md`
        }
      />
      {caption ? <p className="mt-4 text-center text-sm text-muted-foreground">{caption}</p> : null}
    </div>
  );
};

export default FadeInImage;

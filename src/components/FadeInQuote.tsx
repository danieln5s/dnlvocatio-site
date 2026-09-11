import { useEffect, useRef, useState } from "react";

import ProtectedImage from "@/components/ProtectedImage";

interface Props {
  quote: string;
  author?: string;
  /** Object path inside the private bucket, e.g. `reading/john_calvin.jpg`. */
  authorImagePath?: string;
  className?: string;
  /** CSS font-family string to apply to the quote text (optional) */
  fontFamily?: string;
}

const FadeInQuote = ({ quote, author, authorImagePath, className = "", fontFamily }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const DURATION = 2200; // match FadeInImage slow fade

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
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
        "w-full max-w-4xl mx-auto transition-opacity transition-transform " +
        (visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6") +
        (className ? ` ${className}` : "")
      }
    >
      <div className="flex items-start gap-4">
        {authorImagePath ? (
          <ProtectedImage
            path={authorImagePath}
            alt={author ?? "author"}
            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            placeholderClassName="w-16 h-16 rounded-full flex-shrink-0 p-0"
          />
        ) : null}

        <blockquote
          style={fontFamily ? { fontFamily } : undefined}
          className="text-lg md:text-xl leading-relaxed text-foreground"
        >
          <p>“{quote}”</p>
          {author ? <footer className="mt-2 text-sm text-muted-foreground">— {author}</footer> : null}
        </blockquote>
      </div>
    </div>
  );
};

export default FadeInQuote;

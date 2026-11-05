import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Image that sits on a soft placeholder and fades in once decoded — no blank flash,
 * no layout shift. Cached images show instantly. Remounts per src so swaps stay clean.
 */
export function FadeImage(props: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  return <FadeImageInner key={props.src} {...props} />;
}

function FadeImageInner({ className, onLoad, onError, alt = "", ...rest }: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      {...rest}
      alt={alt}
      decoding="async"
      draggable={false}
      ref={(el) => { if (el?.complete && el.naturalWidth > 0 && !loaded) setLoaded(true); }}
      onLoad={(e) => { setLoaded(true); onLoad?.(e); }}
      onError={(e) => { setLoaded(true); onError?.(e); }}
      className={cn("motion-safe:transition-opacity motion-safe:duration-300", loaded ? "opacity-100" : "opacity-0", className)}
    />
  );
}

/**
 * Responsive image with a three-step format ladder.
 *
 *   AVIF  ->  WebP  ->  the original PNG/JPG via the <img> src
 *
 * `srcset` lives on the <source> elements only. Putting it on the <img> as well
 * would be actively unsafe: a browser that cannot decode WebP would still pick
 * a candidate from an untyped srcset and render nothing, whereas a browser that
 * understands <picture> but not WebP does not exist. Leaving the <img> without
 * srcset makes the original a true last resort.
 *
 * `display: contents` keeps the <img> as the effective only child for layout,
 * so every existing width/height/object-fit class resolves against exactly the
 * element it did before. That is what stops this component from moving
 * anything on the page.
 *
 * `width`/`height` must stay the SOURCE dimensions, not the largest variant.
 * They exist only to reserve the aspect-ratio box before the bytes arrive, and
 * every variant preserves the source aspect ratio exactly.
 */

import type { CSSProperties } from "react";

export interface PictureProps {
  /** AVIF candidates, narrowest first. */
  avif?: string | undefined;
  /** WebP candidates, narrowest first. Same widths as `avif`. */
  webp: string;
  /** Original file. Also the intrinsic aspect-ratio source. */
  fallback: string;
  alt: string;
  /** Intrinsic width/height of the SOURCE, for aspect-ratio reservation. */
  width: number;
  height: number;
  /** Slot-width hint so the browser picks a sensible candidate. */
  sizes: string;
  className?: string;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  decoding?: "async" | "sync" | "auto";
}

export function Picture({
  avif,
  webp,
  fallback,
  alt,
  width,
  height,
  sizes,
  className,
  style,
  loading,
  fetchPriority,
  decoding = "async",
}: PictureProps) {
  return (
    <picture className="contents">
      {avif && <source type="image/avif" srcSet={avif} sizes={sizes} />}
      <source type="image/webp" srcSet={webp} sizes={sizes} />
      <img
        src={fallback}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={decoding}
      />
    </picture>
  );
}

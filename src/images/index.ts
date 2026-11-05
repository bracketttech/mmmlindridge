// Single home for every bundled image (property photos, avatars, auth artwork).
// Full photos are ~1024px WebP; *-thumb / avatar files are tiny so small circles never pop in.
import sunset from "./properties/sunset-gardens.webp";
import sunsetThumb from "./properties/sunset-gardens-thumb.webp";
import rosebank from "./properties/rosebank-lofts.webp";
import rosebankThumb from "./properties/rosebank-lofts-thumb.webp";
import bryanston from "./properties/bryanston-villas.webp";
import bryanstonThumb from "./properties/bryanston-villas-thumb.webp";
import campsBay from "./properties/camps-bay.webp";
import campsBayThumb from "./properties/camps-bay-thumb.webp";
import residence from "./auth/residence.webp";
import janice from "./avatars/janice-tinto.webp";
import thandiwe from "./avatars/thandiwe-nkosi.webp";
import pieter from "./avatars/pieter-van-der-merwe.webp";
import lerato from "./avatars/lerato-mokoena.webp";

const PROPERTIES: Record<string, { full: string; thumb: string }> = {
  p1: { full: sunset, thumb: sunsetThumb },
  p2: { full: rosebank, thumb: rosebankThumb },
  p3: { full: bryanston, thumb: bryanstonThumb },
  p4: { full: campsBay, thumb: campsBayThumb },
};

/** People photos keyed by email (lower-case). Anyone missing falls back to initials. */
const AVATARS: Record<string, string> = {
  "janice@nestly.co.za": janice,
  "thandiwe.nkosi@mail.co.za": thandiwe,
  "pieter.vdm@mail.co.za": pieter,
  "lerato.mokoena@mail.co.za": lerato,
};

export const authImage = residence;
export const propertyImage = (id: string): string | undefined => PROPERTIES[id]?.full;
export const propertyThumb = (id: string): string | undefined => PROPERTIES[id]?.thumb;
export const avatarFor = (email?: string | null): string | undefined => (email ? AVATARS[email.toLowerCase()] : undefined);

const warmed = new Set<string>();
/** Fetch + decode images ahead of time so switching property / opening menus never flashes. */
export function preloadImages(urls: (string | undefined)[]) {
  if (typeof window === "undefined") return;
  for (const url of urls) {
    if (!url || warmed.has(url)) continue;
    warmed.add(url);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    img.decode?.().catch(() => warmed.delete(url));
  }
}

export const allShellImages = () => [
  ...Object.values(PROPERTIES).flatMap((p) => [p.thumb, p.full]),
  ...Object.values(AVATARS),
];

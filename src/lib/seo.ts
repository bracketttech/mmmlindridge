export const pageHead = (title: string, description: string, noindex = false) => ({
  meta: [
    { title: `${title} — MMM Lindridge` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — MMM Lindridge` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    ...(noindex ? [{ name: "robots", content: "noindex" }] : []),
  ],
});

export const pageHead = (title: string, description: string, noindex = false) => ({
  meta: [
    { title: `${title} — Nestly` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Nestly` },
    { property: "og:description", content: description },
    ...(noindex ? [{ name: "robots", content: "noindex" }] : []),
  ],
});

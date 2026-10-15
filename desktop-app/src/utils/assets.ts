/** Resolve public asset paths against Vite `base` (supports `./` for Electron). */
export function assetUrl(path: string): string {
  const clean = path.replace(/^\//, "");
  const base = import.meta.env.BASE_URL || "/";
  if (base.endsWith("/")) return `${base}${clean}`;
  return `${base}/${clean}`;
}

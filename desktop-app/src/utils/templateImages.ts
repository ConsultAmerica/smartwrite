/** Bundled template art — survives Vercel deploys that omit public/images. */

const modules = import.meta.glob("../assets/templates/*.svg", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function urlFor(file: string): string {
  const key = `../assets/templates/${file}`;
  return modules[key] ?? "";
}

/** Map public-style paths (/images/foo.svg) to bundled asset URLs. */
export function resolveTemplateImage(path: string): string {
  const file = path.replace(/^\/?images\//, "");
  return urlFor(file) || path;
}

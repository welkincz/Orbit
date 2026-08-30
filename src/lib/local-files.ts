const WINDOWS_DRIVE = /^[a-zA-Z]:$/;

function toPosixRoot(path: string): string | null {
  const normalized = path.replace(/\\/g, "/");
  if (normalized.startsWith("/")) return normalized;
  return WINDOWS_DRIVE.test(normalized.slice(0, 2)) ? `/${normalized}` : null;
}

export function toVscodeFileHref(absolutePath: string): string | null {
  const rooted = toPosixRoot(absolutePath);
  if (rooted === null) return null;

  const encodedPath = rooted
    .split("/")
    .map((segment) => WINDOWS_DRIVE.test(segment) ? segment : encodeURIComponent(segment))
    .join("/");
  return `vscode://file${encodedPath}`;
}

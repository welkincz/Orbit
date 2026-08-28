export function toVscodeFileHref(absolutePath: string): string {
  if (!absolutePath.startsWith("/")) {
    throw new Error("Open Markdown requires an absolute path");
  }

  const encodedPath = absolutePath.split("/").map(encodeURIComponent).join("/");
  return `vscode://file${encodedPath}`;
}

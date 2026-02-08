const RAW_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const BASE_PATH = RAW_BASE_PATH.endsWith("/")
  ? RAW_BASE_PATH.slice(0, -1)
  : RAW_BASE_PATH;

export function withBasePath(urlPath: string): string {
  if (!urlPath.startsWith("/")) {
    return urlPath;
  }
  if (!BASE_PATH) {
    return urlPath;
  }
  if (urlPath === BASE_PATH || urlPath.startsWith(`${BASE_PATH}/`)) {
    return urlPath;
  }
  return `${BASE_PATH}${urlPath}`;
}

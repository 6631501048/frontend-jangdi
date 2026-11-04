import api from "./api";

// Public assets only (avatars). Completion photos are PRIVATE and must use completionProof.js.
export function resolveBackendAssetUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const pathOrUrl = value.trim();
  if (/^(https?:)?\/\//i.test(pathOrUrl)) return pathOrUrl.startsWith("//") ? `${window.location.protocol}${pathOrUrl}` : pathOrUrl;

  // Handle both the backend's `/uploads/...` response and older values saved as `uploads/...`.
  const normalizedPath = pathOrUrl.startsWith("uploads/") ? `/${pathOrUrl}` : pathOrUrl;
  if (!normalizedPath.startsWith("/uploads/")) return null;

  const apiRoot = api.defaults.baseURL || "/api";
  const origin = new URL(apiRoot, window.location.origin).origin;
  return `${origin}${normalizedPath}`;
}

import api from "./api";

// Public assets only (avatars). Completion photos are PRIVATE and must use completionProof.js.
export function resolveBackendAssetUrl(value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (!value.startsWith("/uploads/")) return null;
  const apiRoot = api.defaults.baseURL || "/api";
  const origin = new URL(apiRoot, window.location.origin).origin;
  return `${origin}${value}`;
}

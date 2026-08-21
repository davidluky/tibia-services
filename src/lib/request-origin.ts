export interface RequestOriginContext {
  requestUrl: string
  origin: string | null
  fetchSite: string | null
}

export function isAllowedMutationOrigin({
  requestUrl,
  origin,
  fetchSite,
}: RequestOriginContext): boolean {
  if (fetchSite?.toLowerCase() === 'cross-site') return false

  // Non-browser callers do not always send Origin. Browser cross-site requests
  // are still rejected through Sec-Fetch-Site, while same-origin form/fetch
  // requests are compared against the URL Next received from the proxy.
  if (!origin) return true

  try {
    return new URL(origin).origin === new URL(requestUrl).origin
  } catch {
    return false
  }
}

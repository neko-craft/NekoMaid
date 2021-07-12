let url = decodeURIComponent(location.search.slice(1))
let parsed: URL | null = null

if (!url.startsWith('http://')) url = 'http://' + url

// eslint-disable-next-line no-new
try { parsed = new URL(url) } catch { url = '' }

export const pathname = parsed?.pathname
export const origin = parsed?.origin
export const address = parsed ? parsed.origin + parsed.pathname : null
export const token = parsed?.search?.slice(1)?.replace('token=', '')
export default token ? url : null

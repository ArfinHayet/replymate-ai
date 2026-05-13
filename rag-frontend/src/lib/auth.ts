const TOKEN_KEY = 'rag-auth-token'
const REFRESH_KEY = 'rag-refresh-token'

const COOKIE_OPTS = '; path=/; SameSite=Lax'

export const getToken = (): string | null => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]*)`))  
  return match ? decodeURIComponent(match[1]) : null
}

export const setToken = (token: string): void => {
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}${COOKIE_OPTS}`
}

export const clearToken = (): void => {
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`
}

export const getRefreshToken = (): string | null => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${REFRESH_KEY}=([^;]*)`))  
  return match ? decodeURIComponent(match[1]) : null
}

export const setRefreshToken = (token: string): void => {
  document.cookie = `${REFRESH_KEY}=${encodeURIComponent(token)}${COOKIE_OPTS}`
}

export const clearRefreshToken = (): void => {
  document.cookie = `${REFRESH_KEY}=; path=/; max-age=0`
}

export const isLoggedIn = (): boolean => !!getToken()

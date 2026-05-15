const TOKEN_KEY = 'rag-auth-token'
const REFRESH_KEY = 'rag-refresh-token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)

export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token)

export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY)

export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_KEY)

export const setRefreshToken = (token: string): void => localStorage.setItem(REFRESH_KEY, token)

export const clearRefreshToken = (): void => localStorage.removeItem(REFRESH_KEY)

export const isLoggedIn = (): boolean => !!getToken()

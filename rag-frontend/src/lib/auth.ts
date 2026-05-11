const TOKEN_KEY = 'rag-auth-token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY)
export const isLoggedIn = (): boolean => !!localStorage.getItem(TOKEN_KEY)

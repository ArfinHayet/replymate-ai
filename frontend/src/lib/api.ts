import axios from 'axios'
import { apiRoutes } from './apiRoutes'
import { clearRefreshToken, clearToken, getRefreshToken, getToken, setRefreshToken, setToken } from './auth'

export const API_BASE_URL = import.meta.env.VITE_API_URL

export const api = axios.create({ baseURL: API_BASE_URL })

interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = error as import('axios').AxiosError
    const status = axiosError.response?.status
    const originalRequest = axiosError.config as
      | (import('axios').InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined

    if (status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        clearToken()
        clearRefreshToken()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise<import('axios').AxiosResponse>((resolve) => {
          refreshQueue.push((newToken) => {
            originalRequest.headers = originalRequest.headers ?? {}
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post<RefreshTokenResponse>(`${API_BASE_URL}${apiRoutes.auth.refresh}`, {
          refresh_token: refreshToken,
        })
        setToken(data.access_token)
        setRefreshToken(data.refresh_token)

        refreshQueue.forEach((callback) => callback(data.access_token))
        refreshQueue = []

        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`
        return api(originalRequest)
      } catch {
        clearToken()
        clearRefreshToken()
        refreshQueue = []
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

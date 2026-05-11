import axios from 'axios'
import { getToken, setToken, clearToken } from './auth'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({ baseURL: BASE_URL })

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface Pdf {
  id: string
  fileName: string
  createdAt: string
}

export interface UploadResult {
  message: string
  fileName: string
  chunksCreated: number
  pdfId: string
}

export interface ChatResponse {
  answer: string
  cached: boolean
}

export const uploadPdf = (file: File, onProgress?: (pct: number) => void) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<UploadResult>('/admin/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
}

export const listPdfs = (): Promise<Pdf[]> => api.get('/pdfs').then((r) => r.data)
export const getPdf = (id: string): Promise<Pdf> => api.get(`/pdfs/${id}`).then((r) => r.data)
export const renamePdf = (id: string, fileName: string) =>
  api.patch(`/pdfs/${id}`, { fileName }).then((r) => r.data)
export const deletePdf = (id: string) => api.delete(`/pdfs/${id}`)

export const sendChat = (message: string, sessionId: string): Promise<ChatResponse> =>
  api.post('/chat', { message, sessionId }).then((r) => r.data)

// ── Company ──────────────────────────────────────────────────────────────────

export interface Company {
  id: string
  name: string
  shortDescription: string
  createdAt: string
  updatedAt: string
}

export const listCompanies = (): Promise<Company[]> =>
  api.get('/company').then((r) => r.data)

export const createCompany = (data: { name: string; shortDescription: string }): Promise<Company> =>
  api.post('/company', data).then((r) => r.data)

export const updateCompany = (
  id: string,
  data: { name?: string; shortDescription?: string },
): Promise<Company> => api.patch(`/company/${id}`, data).then((r) => r.data)

export const deleteCompany = (id: string) => api.delete(`/company/${id}`)

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: AuthUser
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const res = await api.post<LoginResponse>('/auth/login', { email, password })
  setToken(res.data.access_token)
  return res.data
}

export const signup = (email: string, password: string): Promise<{ message: string; userId?: string }> =>
  api.post('/auth/signup', { email, password }).then((r) => r.data)

export const logout = (): void => clearToken()


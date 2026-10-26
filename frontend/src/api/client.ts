import axios, { AxiosError } from 'axios'

// JWT is read from localStorage on every request and the user is
// bounced to /login on any 401 (expired/invalid token, disabled account, etc.). Storing
// the JWT in localStorage is an accepted v1 limitation (XSS-readable).
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('role')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

// Every backend error body is {message, status} (GlobalExceptionHandler) - field-level
// validation errors are already joined into one string server-side ("field: msg; field: msg").
export function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError && typeof error.response?.data?.message === 'string') {
    return error.response.data.message
  }
  return 'Something went wrong. Please try again.'
}

import axios from 'axios'

// todo.md Phase 24.3 - JWT is read from localStorage on every request and the user is
// bounced to /login on any 401 (expired/invalid token, disabled account, etc.). Storing
// the JWT in localStorage is an accepted v1 limitation (XSS-readable) - see AGENTS.md.
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

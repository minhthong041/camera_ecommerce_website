import axios from 'axios'

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const message =
        error.response.data?.detail ??
        error.response.statusText ??
        'API request failed'

      return Promise.reject(
        new ApiError(message, {
          status: error.response.status,
          data: error.response.data,
        }),
      )
    }

    if (error.request) {
      return Promise.reject(
        new ApiError('Cannot connect to the API server. Please try again.'),
      )
    }

    return Promise.reject(new ApiError(error.message))
  },
)

export default apiClient

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

// Gắn Token vào Header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Xử lý lỗi trả về & Tự động Refresh Token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // NẾU LỖI 401 (HẾT HẠN TOKEN) VÀ CHƯA TỪNG THỬ LẠI
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Đánh dấu là đang thử lại để tránh lặp vô hạn

      try {
        const refreshToken = localStorage.getItem('refresh');
        if (refreshToken) {
          // Dùng axios thô (không dùng apiClient) để tránh chạy lại interceptor này
          const res = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh: refreshToken });
          
          const newAccess = res.data.access;
          localStorage.setItem('token', newAccess);

          // Gắn token mới vào request bị lỗi cũ và gọi lại
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error("Lỗi khi refresh token:", refreshError); // Thêm dòng này
        // Nếu refresh token cũng hết hạn -> Đá văng ra màn hình đăng nhập
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(new ApiError('Phiên đăng nhập đã hết hạn', { status: 401 }));
      }
    }

    // Các lỗi khác vẫn ném ra ApiError như cũ
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
import axios from 'axios'

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Khai báo biến giữ Promise để xử lý concurrent refresh requests
let refreshTokenPromise = null;

const clearStoredSession = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('refresh')
  localStorage.removeItem('user')
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi 401 và chưa từng thử lại
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh');

      // Nếu không có refresh token thì văng ra login luôn
      if (!refreshToken) {
        clearStoredSession();
        window.location.replace('/login');
        return Promise.reject(new ApiError('Phiên đăng nhập đã hết hạn', { status: 401 }));
      }

      // NẾU CHƯA CÓ AI ĐI XIN TOKEN THÌ BẮT ĐẦU XIN
      if (!refreshTokenPromise) {
        refreshTokenPromise = axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh: refreshToken })
          .then(res => {
            const newAccess = res.data.access;
            const newRefresh = res.data.refresh; // Lấy cả refresh token mới

            localStorage.setItem('token', newAccess);
            if (newRefresh) {
              localStorage.setItem('refresh', newRefresh); // Lưu refresh token mới theo cơ chế Rotation
            }
            return newAccess;
          })
          .catch(err => {
            clearStoredSession();
            window.location.replace('/login');
            return Promise.reject(err);
          })
          .finally(() => {
            // Xin xong (hoặc thất bại) thì xóa Promise đi để lần sau còn chạy lại được
            refreshTokenPromise = null;
          });
      }

      try {
        // TẤT CẢ CÁC REQUEST 401 SẼ ĐỨNG ĐỢI Ở ĐÂY cho đến khi Token mới được trả về
        const newAccess = await refreshTokenPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        // Refresh rotation đã blacklist token cũ, nên logout phải gửi token mới.
        if (originalRequest.url?.endsWith('/auth/logout/')) {
          originalRequest.data = JSON.stringify({
            refresh: localStorage.getItem('refresh'),
          });
        }

        return apiClient(originalRequest);
      } catch {
        return Promise.reject(new ApiError('Phiên đăng nhập đã hết hạn', { status: 401 }));
      }
    }

    // Xử lý các lỗi khác
    if (error.response) {
      const message = error.response.data?.detail ?? error.response.statusText ?? 'API request failed'
      return Promise.reject(
        new ApiError(message, {
          status: error.response.status,
          data: error.response.data,
        })
      )
    }

    if (error.request) {
      return Promise.reject(new ApiError('Cannot connect to the API server. Please try again.'))
    }

    return Promise.reject(new ApiError(error.message))
  }
)

export default apiClient

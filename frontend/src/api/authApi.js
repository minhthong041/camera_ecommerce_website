import client from './client';

const authApi = {
  login: (data) => client.post('/auth/login/', data),
  register: (data) => client.post('/auth/register/', data),
  refresh: (data) => client.post('/auth/refresh/', data),
  logout: (data) => client.post('/auth/logout/', data),
  logoutAll: () => client.post('/auth/logout-all/'),
  getProfile: () => client.get('/auth/profile/'),
  
  // Đã thêm: API cập nhật thông tin cá nhân (dùng PATCH)
  updateProfile: (data) => client.patch('/auth/profile/', data),
  
  // Đã sửa: Đổi tên và method thành DELETE để xóa tài khoản (Soft Delete)
  softDeleteAccount: () => client.delete('/auth/account/'),
  changePassword: (data) => client.post('/auth/change-password/', data),
  requestPasswordReset: (email) =>
    client.post('/auth/password-reset/', { email }),
  confirmPasswordReset: (data) =>
    client.post('/auth/password-reset/confirm/', data),
};

export default authApi;

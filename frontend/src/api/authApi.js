// src/api/authApi.js
import client from './client'; // Import client mà bạn của bạn đã cấu hình sẵn

const authApi = {
  // API Đăng nhập
  login: (data) => {
    // data bao gồm { email, password }
    return client.post('/auth/login/', data);
  },

  // API Đăng ký
  register: (data) => {
    return client.post('/auth/register/', data);
  }
};

export default authApi;
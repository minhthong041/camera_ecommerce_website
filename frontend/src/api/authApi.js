import client from './client';

const authApi = {
  login: (data) => client.post('/auth/login/', data),
  register: (data) => client.post('/auth/register/', data),
  // Thêm các endpoint bị thiếu
  refresh: (data) => client.post('/auth/refresh/', data),
  logout: (data) => client.post('/auth/logout/', data),
  getProfile: () => client.get('/auth/profile/'),
  getAccount: () => client.get('/auth/account/')
};

export default authApi;
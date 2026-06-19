import client from './client';

const promotionsApi = {
  // Đổi thành applyPromotion và dùng POST thay vì GET
  applyPromotion: (data) => client.post('/promotions/apply/', data),
};

export default promotionsApi;
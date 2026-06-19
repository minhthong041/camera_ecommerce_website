import client from './client';

const unwrap = (response) => response.data;

const orderApi = {
  // Gửi thông tin thanh toán để tạo đơn hàng mới
  // Payload thường bao gồm: address, shipping_method, payment_method
  createOrder: (orderData) => client.post('/orders/', orderData).then(unwrap),
  
  // (Dự phòng) Lấy danh sách đơn hàng đã mua để dùng cho trang Lịch sử đơn hàng sau này
  getMyOrders: () => client.get('/orders/').then(unwrap),
};

export default orderApi;
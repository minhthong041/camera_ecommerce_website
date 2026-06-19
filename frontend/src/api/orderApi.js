import client from './client';

const unwrap = (response) => response.data;

const orderApi = {
  // 1. Đổi endpoint từ /orders/ thành /orders/checkout/ theo đúng review
  checkout: (data) => client.post('/orders/checkout/', data).then(unwrap),
  
  // 2. Thêm API lấy danh sách địa chỉ của user
  getAddresses: () => client.get('/addresses/').then(unwrap),
  
  // 3. Thêm API lấy phương thức giao hàng thật từ DB
  getShippingMethods: () => client.get('/shipping-methods/').then(unwrap),
  
  // 4. API khởi tạo thanh toán (Sau khi tạo đơn hàng thành công)
  createPayment: (orderCode, gateway) => 
    client.post('/payments/', { order_code: orderCode, gateway }).then(unwrap),
};

export default orderApi;
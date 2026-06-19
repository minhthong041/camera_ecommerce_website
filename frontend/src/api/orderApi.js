import client from './client';

const unwrap = (response) => response.data;

const orderApi = {
  checkout: (data) => client.post('/orders/checkout/', data).then(unwrap),

  getAddresses: () => client.get('/addresses/').then(unwrap),

  getShippingMethods: () => client.get('/shipping-methods/').then(unwrap),

  // API mới: Lấy danh sách cổng thanh toán từ backend
  getPaymentMethods: () => client.get('/payments/methods/').then(unwrap),

  // API mới: Tạo thanh toán với payload chuẩn { order_id, payment_method_id }
  createPayment: ({ orderId, paymentMethodId }) => 
    client.post('/payments/', {
      order_id: orderId,
      payment_method_id: paymentMethodId,
    }).then(unwrap),
};

export default orderApi;
import client from "./client";

const unwrap = (response) => response.data;

const orderApi = {
  checkout: (data) => client.post("/orders/checkout/", data).then(unwrap),
  getAddresses: () => client.get("/addresses/").then(unwrap),
  getShippingMethods: () => client.get("/shipping-methods/").then(unwrap),
  getPaymentMethods: () => client.get("/payments/methods/").then(unwrap),
  getOrders: () => client.get("/orders/").then(unwrap),
  getOrder: (orderId) => client.get(`/orders/${orderId}/`).then(unwrap),
  initializePayment: (paymentId) =>
    client.post(`/payments/${paymentId}/initialize/`).then(unwrap),

  verifyPayment: (queryString) =>
    client.get(`/payments/vnpay/callback/?${queryString}`).then(unwrap),
};

export default orderApi;

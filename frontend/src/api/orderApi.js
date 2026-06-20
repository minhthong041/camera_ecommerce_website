import client from "./client";

const unwrap = (response) => response.data;

const orderApi = {
  checkout: (data) => client.post("/orders/checkout/", data).then(unwrap),
  getAddresses: () => client.get("/addresses/").then(unwrap),
  getShippingMethods: () => client.get("/shipping-methods/").then(unwrap),
  getPaymentMethods: () => client.get("/payments/methods/").then(unwrap),

  // API xác nhận kết quả thanh toán từ backend thay vì tự check trên URL
  verifyPayment: (queryString) =>
    client.get(`/payments/vnpay-return/?${queryString}`).then(unwrap),
};

export default orderApi;

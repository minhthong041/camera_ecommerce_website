import client from './client';

const unwrap = (response) => response.data;

const cartApi = {
  // Lấy thông tin giỏ hàng hiện tại
  getCart: () => client.get('/cart/').then(unwrap),

  // Thêm sản phẩm vào giỏ (data thường gồm { product_id, quantity })
  addToCart: (data) => client.post('/cart/items/', data).then(unwrap),

  // Cập nhật số lượng 1 sản phẩm trong giỏ (dùng PATCH)
  updateItemQuantity: (itemId, quantity) =>
    client.patch(`/cart/items/${itemId}/`, { quantity }).then(unwrap),

  // Xóa 1 sản phẩm khỏi giỏ (dùng DELETE)
  removeItem: (itemId) => client.delete(`/cart/items/${itemId}/`).then(unwrap),
};

export default cartApi;
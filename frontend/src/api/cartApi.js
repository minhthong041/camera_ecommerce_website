import client from './client';

const cartApi = {
  getCart: () => client.get('/cart/'),
  // Đổi từ /cart/ sang /cart/items/
  addToCart: (data) => client.post('/cart/items/', data), 
};

export default cartApi;
import client from './client';

const cartApi = {
  getCart: () => client.get('/cart/'),
  addToCart: (data) => client.post('/cart/', data),
};

export default cartApi;
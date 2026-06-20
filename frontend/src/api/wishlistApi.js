import client from './client';

const wishlistApi = {
  getWishlist: () => client.get('/wishlist/').then((response) => response.data),
  addItem: (productItemId) =>
    client
      .post('/wishlist/', { product_item_id: productItemId })
      .then((response) => response.data),
  removeItem: (productItemId) => client.delete(`/wishlist/${productItemId}/`),
};

export default wishlistApi;

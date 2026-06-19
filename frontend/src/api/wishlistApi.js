import client from './client';

const wishlistApi = {
  getWishlist: () => client.get('/wishlist/'),
};

export default wishlistApi;
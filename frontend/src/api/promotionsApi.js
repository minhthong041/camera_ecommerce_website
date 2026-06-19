import client from './client';

const promotionsApi = {
  getPromotions: () => client.get('/promotions/'),
};

export default promotionsApi;
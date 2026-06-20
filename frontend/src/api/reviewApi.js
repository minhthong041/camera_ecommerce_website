import client from "./client";

const unwrap = (response) => response.data;

const reviewApi = {
  getProductReviews: (productId, params = {}) =>
    client.get(`/products/${productId}/reviews/`, { params }).then(unwrap),
  createReview: (data) => client.post("/reviews/", data).then(unwrap),
  updateReview: (id, data) => client.patch(`/reviews/${id}/`, data).then(unwrap),
  deleteReview: (id) => client.delete(`/reviews/${id}/`),
};

export default reviewApi;

import apiClient from './client'

const unwrap = (response) => response.data

export const catalogApi = {
  getBrands: () => apiClient.get('/catalog/brands/').then(unwrap),

  getBrand: (id) => apiClient.get(`/catalog/brands/${id}/`).then(unwrap),

  getCategories: () => apiClient.get('/catalog/categories/').then(unwrap),

  getCategory: (id) => apiClient.get(`/catalog/categories/${id}/`).then(unwrap),

  getProducts: (params = {}) =>
    apiClient.get('/catalog/products/', { params }).then(unwrap),

  getProduct: (id) => apiClient.get(`/catalog/products/${id}/`).then(unwrap),

  getProductItems: (params = {}) =>
    apiClient.get('/catalog/product-items/', { params }).then(unwrap),

  getProductItem: (id) =>
    apiClient.get(`/catalog/product-items/${id}/`).then(unwrap),
}

export default catalogApi

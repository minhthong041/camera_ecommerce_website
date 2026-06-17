import apiClient from './client'

const unwrap = (response) => response.data

const compactParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )

const buildProductListParams = ({
  categoryId,
  brandId,
  search,
  page,
  pageSize,
} = {}) =>
  // DRF filterset expects category/brand, while React screens use categoryId/brandId.
  compactParams({
    category: categoryId,
    brand: brandId,
    search,
    page,
    page_size: pageSize,
  })

export const catalogApi = {
  getBrands: () => apiClient.get('/catalog/brands/').then(unwrap),

  getBrand: (id) => apiClient.get(`/catalog/brands/${id}/`).then(unwrap),

  getCategories: () => apiClient.get('/catalog/categories/').then(unwrap),

  getCategory: (id) => apiClient.get(`/catalog/categories/${id}/`).then(unwrap),

  getProducts: (query = {}) =>
    apiClient
      .get('/catalog/products/', { params: buildProductListParams(query) })
      .then(unwrap),

  getProduct: (id) => apiClient.get(`/catalog/products/${id}/`).then(unwrap),

  getProductItems: (params = {}) =>
    apiClient.get('/catalog/product-items/', { params }).then(unwrap),

  getProductItem: (id) =>
    apiClient.get(`/catalog/product-items/${id}/`).then(unwrap),
}

export default catalogApi

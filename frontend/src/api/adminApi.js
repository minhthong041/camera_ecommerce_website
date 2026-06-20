import client from "./client";

const unwrap = (response) => response.data;

const adminApi = {
  getOrders: (params = {}) => client.get("/admin/orders/", { params }).then(unwrap),
  updateOrderStatus: (id, status) => client.patch(`/admin/orders/${id}/status/`, { status }).then(unwrap),
  getReturns: () => client.get("/admin/returns/").then(unwrap),
  updateReturnStatus: (id, status) => client.patch(`/admin/returns/${id}/status/`, { status }).then(unwrap),
  getProductItems: () => client.get("/admin/product-items/").then(unwrap),
  updateStock: (id, qtyInStock, note) => client.patch(`/admin/product-items/${id}/stock/`, { qty_in_stock: qtyInStock, note }).then(unwrap),
  getInventoryLedger: (params = {}) => client.get("/admin/inventory/ledger/", { params }).then(unwrap),
  getBrands: () => client.get("/admin/brands/").then(unwrap),
  createBrand: (data) => client.post("/admin/brands/", data).then(unwrap),
  getCategories: () => client.get("/admin/categories/").then(unwrap),
  createCategory: (data) => client.post("/admin/categories/", data).then(unwrap),
  updateCategory: (id, data) => client.patch(`/admin/categories/${id}/`, data).then(unwrap),
  getProducts: () => client.get("/admin/products/").then(unwrap),
  createProduct: (data) => client.post("/admin/products/", data).then(unwrap),
  updateProduct: (id, data) => client.patch(`/admin/products/${id}/`, data).then(unwrap),
  createProductItem: (data) => client.post("/admin/product-items/", data).then(unwrap),
  getCustomers: () => client.get("/admin/customers/").then(unwrap),
  createCustomer: (data) => client.post("/admin/customers/", data).then(unwrap),
  updateCustomer: (id, data) => client.patch(`/admin/customers/${id}/`, data).then(unwrap),
  getEmployees: () => client.get("/admin/employees/").then(unwrap),
  createEmployee: (data) => client.post("/admin/employees/", data).then(unwrap),
  updateEmployee: (id, data) => client.patch(`/admin/employees/${id}/`, data).then(unwrap),
  deleteEmployee: (id) => client.delete(`/admin/employees/${id}/`),
  getStatistics: () => client.get("/admin/statistics/").then(unwrap),
  getDiscountTypes: () => client.get("/admin/discount-types/").then(unwrap),
  getPromotions: () => client.get("/admin/promotions/").then(unwrap),
  createPromotion: (data) => client.post("/admin/promotions/", data).then(unwrap),
  updatePromotion: (id, data) => client.patch(`/admin/promotions/${id}/`, data).then(unwrap),
  deletePromotion: (id) => client.delete(`/admin/promotions/${id}/`),
};

export default adminApi;

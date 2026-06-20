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
};

export default adminApi;

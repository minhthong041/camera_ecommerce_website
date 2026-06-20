import { useContext, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Boxes, Edit3, ImagePlus, PackagePlus, Plus, RotateCcw, Trash2, X } from "lucide-react";
import adminApi from "../../api/adminApi";
import { AuthContext } from "../../context/AuthContext";
import LoadingState from "../common/LoadingState";

const asList = (value) => value?.results || value || [];
const emptyProduct = () => ({ id: null, name: "", category: "", brand: "", description: "", tech_specs: "{}", is_active: true });
const emptySku = (productId = "") => ({ id: null, product: String(productId), sku: "", price: "", qty_in_stock: 0, original_quantity: 0, condition: "New", product_image: null, image_url: "" });
const slugify = (value) => value.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const getErrorMessage = (error) => {
  const data = error?.data;
  if (!data) return error?.message || "Không thể lưu dữ liệu.";
  if (typeof data.detail === "string") return data.detail;
  return String(Object.values(data).flat(Infinity).find(Boolean) || "Dữ liệu không hợp lệ.");
};

function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"><section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-md bg-white shadow-xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4"><h2 className="text-lg font-bold text-gray-900">{title}</h2><button type="button" onClick={onClose} title="Đóng" className="p-2 text-gray-500 hover:text-gray-900"><X className="h-5 w-5" /></button></header>{children}</section></div>;
}

export default function ProductManagementPanel() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role_name?.toLowerCase() === "admin";
  const queryClient = useQueryClient();
  const [category, setCategory] = useState({ name: "", parent: "", description: "" });
  const [brand, setBrand] = useState({ name: "", logo_url: "" });
  const [productForm, setProductForm] = useState(null);
  const [skuForm, setSkuForm] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const brandsQuery = useQuery({ queryKey: ["adminBrands"], queryFn: adminApi.getBrands });
  const categoriesQuery = useQuery({ queryKey: ["adminCategories"], queryFn: adminApi.getCategories });
  const productsQuery = useQuery({ queryKey: ["adminProducts"], queryFn: adminApi.getProducts });
  const itemsQuery = useQuery({ queryKey: ["adminProductItems"], queryFn: () => adminApi.getProductItems() });
  const brands = asList(brandsQuery.data);
  const categories = asList(categoriesQuery.data);
  const products = asList(productsQuery.data);
  const productItems = asList(itemsQuery.data);
  const itemsByProduct = useMemo(() => {
    const grouped = new Map();
    productItems.forEach((item) => grouped.set(item.product, [...(grouped.get(item.product) || []), item]));
    return grouped;
  }, [productItems]);

  const refreshCatalog = () => {
    queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
    queryClient.invalidateQueries({ queryKey: ["adminProductItems"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };
  const referenceMutation = useMutation({
    mutationFn: ({ type, payload }) => (type === "brand" ? adminApi.createBrand(payload) : adminApi.createCategory(payload)),
    onSuccess: (_, variables) => {
      setError("");
      setMessage(variables.type === "brand" ? "Đã tạo thương hiệu." : "Đã tạo danh mục.");
      if (variables.type === "brand") { setBrand({ name: "", logo_url: "" }); queryClient.invalidateQueries({ queryKey: ["adminBrands"] }); }
      else { setCategory({ name: "", parent: "", description: "" }); queryClient.invalidateQueries({ queryKey: ["adminCategories"] }); }
    },
    onError: (requestError) => setError(getErrorMessage(requestError)),
  });
  const productMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? adminApi.updateProduct(id, payload) : adminApi.createProduct(payload)),
    onSuccess: (savedProduct, variables) => {
      setError("");
      setMessage(variables.id ? "Đã cập nhật sản phẩm." : "Đã tạo sản phẩm. Hãy thêm SKU đầu tiên.");
      setProductForm(null);
      refreshCatalog();
      if (!variables.id) setSkuForm(emptySku(savedProduct.id));
    },
    onError: (requestError) => setError(getErrorMessage(requestError)),
  });
  const skuMutation = useMutation({
    mutationFn: async ({ formData, values }) => {
      if (!values.id) return adminApi.createProductItem(formData);
      const savedItem = await adminApi.updateProductItem(values.id, formData);
      if (Number(values.qty_in_stock) !== Number(values.original_quantity)) return adminApi.updateStock(values.id, Number(values.qty_in_stock), "Updated from product management");
      return savedItem;
    },
    onSuccess: (_, variables) => {
      setError("");
      setMessage(variables.values.id ? "Đã cập nhật SKU." : "Đã tạo SKU và ghi nhận tồn kho ban đầu.");
      setSkuForm(null);
      refreshCatalog();
      queryClient.invalidateQueries({ queryKey: ["inventoryLedger"] });
    },
    onError: (requestError) => setError(getErrorMessage(requestError)),
  });
  const deleteMutation = useMutation({
    mutationFn: ({ type, id }) => (type === "product" ? adminApi.deleteProduct(id) : adminApi.deleteProductItem(id)),
    onSuccess: (_, variables) => { setError(""); setMessage(variables.type === "product" ? "Đã xóa sản phẩm." : "Đã xóa SKU."); refreshCatalog(); },
    onError: (requestError) => setError(getErrorMessage(requestError)),
  });

  if (brandsQuery.isLoading || categoriesQuery.isLoading || productsQuery.isLoading || itemsQuery.isLoading) return <LoadingState message="Đang tải catalog..." />;
  const fieldClass = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none";
  const openProductEditor = (product = null) => {
    setError("");
    setProductForm(product ? { id: product.id, name: product.name, category: String(product.category), brand: String(product.brand), description: product.description || "", tech_specs: JSON.stringify(product.tech_specs || {}, null, 2), is_active: product.is_active } : emptyProduct());
  };
  const openSkuEditor = (item = null, productId = "") => {
    setError("");
    setSkuForm(item ? { id: item.id, product: String(item.product), sku: item.sku, price: item.price, qty_in_stock: item.qty_in_stock, original_quantity: item.qty_in_stock, condition: item.condition, product_image: null, image_url: item.product_image || "" } : emptySku(productId));
  };
  const submitProduct = (event) => {
    event.preventDefault();
    let techSpecs;
    try {
      techSpecs = JSON.parse(productForm.tech_specs || "{}");
      if (Array.isArray(techSpecs) || techSpecs === null || typeof techSpecs !== "object") throw new Error();
    } catch { setError("Thông số kỹ thuật phải là JSON object hợp lệ."); return; }
    productMutation.mutate({ id: productForm.id, payload: { name: productForm.name.trim(), category: Number(productForm.category), brand: Number(productForm.brand), description: productForm.description, tech_specs: techSpecs, is_active: productForm.is_active } });
  };
  const submitSku = (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("product", skuForm.product);
    formData.append("sku", skuForm.sku.trim());
    formData.append("price", skuForm.price);
    formData.append("condition", skuForm.condition.trim());
    if (!skuForm.id) formData.append("qty_in_stock", String(Number(skuForm.qty_in_stock)));
    if (skuForm.product_image) formData.append("product_image", skuForm.product_image);
    skuMutation.mutate({ formData, values: skuForm });
  };
  const toggleProduct = (product) => productMutation.mutate({ id: product.id, payload: { is_active: !product.is_active } });

  return <div className="space-y-8">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4"><div><h2 className="text-lg font-bold text-gray-900">Sản phẩm và SKU</h2><p className="text-sm text-gray-500">{products.length} sản phẩm, {productItems.length} SKU</p></div><button type="button" onClick={() => openProductEditor()} className="flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"><Plus className="h-4 w-4" /> Thêm sản phẩm</button></header>
    {(message || error) && <p className={`border-l-4 px-3 py-2 text-sm ${error ? "border-red-500 bg-red-50 text-red-700" : "border-green-500 bg-green-50 text-green-700"}`}>{error || message}</p>}
    <div className="grid gap-5 lg:grid-cols-2">
      <form onSubmit={(event) => { event.preventDefault(); referenceMutation.mutate({ type: "brand", payload: brand }); }} className="grid gap-3 border-b border-gray-200 pb-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-sm font-medium">Thương hiệu<input required value={brand.name} onChange={(event) => setBrand((current) => ({ ...current, name: event.target.value }))} className={fieldClass} /></label><label className="text-sm font-medium">Logo URL<input value={brand.logo_url} onChange={(event) => setBrand((current) => ({ ...current, logo_url: event.target.value }))} className={fieldClass} /></label><button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Thêm</button></form>
      <form onSubmit={(event) => { event.preventDefault(); referenceMutation.mutate({ type: "category", payload: { ...category, slug: slugify(category.name), parent: category.parent || null } }); }} className="grid gap-3 border-b border-gray-200 pb-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label className="text-sm font-medium">Danh mục<input required value={category.name} onChange={(event) => setCategory((current) => ({ ...current, name: event.target.value }))} className={fieldClass} /></label><label className="text-sm font-medium">Danh mục cha<select value={category.parent} onChange={(event) => setCategory((current) => ({ ...current, parent: event.target.value }))} className={fieldClass}><option value="">Không có</option>{categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Thêm</button></form>
    </div>
    <div className="space-y-4">
      {products.length === 0 && <div className="py-14 text-center text-gray-500"><Boxes className="mx-auto mb-3 h-9 w-9" /><p>Chưa có sản phẩm.</p></div>}
      {products.map((product) => {
        const items = itemsByProduct.get(product.id) || [];
        return <section key={product.id} className="border-y border-gray-200 bg-white"><div className="flex flex-wrap items-center gap-4 px-3 py-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-gray-900">{product.name}</h3><span className={`px-2 py-0.5 text-xs font-semibold ${product.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{product.is_active ? "Đang bán" : "Đã ẩn"}</span></div><p className="mt-1 text-sm text-gray-500">{product.category_name} · {product.brand_name} · {items.length} SKU</p></div><div className="flex items-center gap-1"><button type="button" onClick={() => openSkuEditor(null, product.id)} title="Thêm SKU" className="p-2 text-orange-700 hover:bg-orange-50"><PackagePlus className="h-5 w-5" /></button><button type="button" onClick={() => openProductEditor(product)} title="Chỉnh sửa sản phẩm" className="p-2 text-gray-700 hover:bg-gray-100"><Edit3 className="h-5 w-5" /></button><button type="button" onClick={() => toggleProduct(product)} title={product.is_active ? "Ẩn sản phẩm" : "Bán lại sản phẩm"} className="p-2 text-gray-700 hover:bg-gray-100">{product.is_active ? <Archive className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />}</button>{isAdmin && <button type="button" onClick={() => window.confirm(`Xóa vĩnh viễn ${product.name}?`) && deleteMutation.mutate({ type: "product", id: product.id })} title="Xóa sản phẩm" className="p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-5 w-5" /></button>}</div></div><div className="overflow-x-auto border-t border-gray-100"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-2">Ảnh</th><th>SKU</th><th>Tình trạng</th><th>Giá</th><th>Tồn kho</th><th className="text-right">Thao tác</th></tr></thead><tbody className="divide-y">{items.map((item) => <tr key={item.id}><td className="px-4 py-2">{item.product_image ? <img src={item.product_image} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="flex h-10 w-10 items-center justify-center bg-gray-100"><ImagePlus className="h-4 w-4 text-gray-400" /></div>}</td><td className="font-semibold">{item.sku}</td><td>{item.condition}</td><td>{Number(item.price).toLocaleString("vi-VN")} đ</td><td className={item.qty_in_stock <= 5 ? "font-bold text-red-600" : ""}>{item.qty_in_stock}</td><td><div className="flex justify-end gap-1"><button type="button" onClick={() => openSkuEditor(item)} title="Chỉnh sửa SKU" className="p-2 text-gray-700 hover:bg-gray-100"><Edit3 className="h-4 w-4" /></button>{isAdmin && <button type="button" onClick={() => window.confirm(`Xóa SKU ${item.sku}?`) && deleteMutation.mutate({ type: "sku", id: item.id })} title="Xóa SKU" className="p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}</div></td></tr>)}{items.length === 0 && <tr><td colSpan="6" className="px-4 py-5 text-center text-gray-500">Sản phẩm chưa có SKU.</td></tr>}</tbody></table></div></section>;
      })}
    </div>
    {productForm && <Modal title={productForm.id ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"} onClose={() => setProductForm(null)}><form onSubmit={submitProduct} className="space-y-5 p-5"><label className="block text-sm font-medium">Tên sản phẩm<input required maxLength="255" value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} className={fieldClass} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Danh mục<select required value={productForm.category} onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))} className={fieldClass}><option value="">Chọn danh mục</option>{categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><label className="text-sm font-medium">Thương hiệu<select required value={productForm.brand} onChange={(event) => setProductForm((current) => ({ ...current, brand: event.target.value }))} className={fieldClass}><option value="">Chọn thương hiệu</option>{brands.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label></div><label className="block text-sm font-medium">Mô tả<textarea rows="4" value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} className={fieldClass} /></label><label className="block text-sm font-medium">Thông số kỹ thuật (JSON)<textarea rows="7" spellCheck="false" value={productForm.tech_specs} onChange={(event) => setProductForm((current) => ({ ...current, tech_specs: event.target.value }))} className={`${fieldClass} font-mono`} /></label><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={productForm.is_active} onChange={(event) => setProductForm((current) => ({ ...current, is_active: event.target.checked }))} /> Đang bán</label>{error && <p className="text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={() => setProductForm(null)} className="px-4 py-2 text-sm font-semibold text-gray-600">Hủy</button><button disabled={productMutation.isPending} className="rounded-md bg-orange-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{productMutation.isPending ? "Đang lưu..." : "Lưu sản phẩm"}</button></div></form></Modal>}
    {skuForm && <Modal title={skuForm.id ? "Chỉnh sửa SKU" : "Thêm SKU"} onClose={() => setSkuForm(null)}><form onSubmit={submitSku} className="space-y-5 p-5"><label className="block text-sm font-medium">Sản phẩm<select required value={skuForm.product} onChange={(event) => setSkuForm((current) => ({ ...current, product: event.target.value }))} className={fieldClass}><option value="">Chọn sản phẩm</option>{products.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Mã SKU<input required maxLength="100" value={skuForm.sku} onChange={(event) => setSkuForm((current) => ({ ...current, sku: event.target.value }))} className={fieldClass} /></label><label className="text-sm font-medium">Tình trạng<input required maxLength="50" value={skuForm.condition} onChange={(event) => setSkuForm((current) => ({ ...current, condition: event.target.value }))} className={fieldClass} /></label><label className="text-sm font-medium">Giá bán<input required type="number" min="1" step="0.01" value={skuForm.price} onChange={(event) => setSkuForm((current) => ({ ...current, price: event.target.value }))} className={fieldClass} /></label><label className="text-sm font-medium">Tồn kho<input required type="number" min="0" step="1" value={skuForm.qty_in_stock} onChange={(event) => setSkuForm((current) => ({ ...current, qty_in_stock: event.target.value }))} className={fieldClass} /></label></div><label className="block text-sm font-medium">Ảnh sản phẩm<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setSkuForm((current) => ({ ...current, product_image: event.target.files?.[0] || null }))} className={`${fieldClass} file:mr-3 file:border-0 file:bg-gray-100 file:px-3 file:py-1`} /></label>{skuForm.image_url && !skuForm.product_image && <img src={skuForm.image_url} alt="Ảnh SKU hiện tại" className="h-24 w-24 rounded object-cover" />}{skuForm.product_image && <p className="text-sm text-gray-500">{skuForm.product_image.name}</p>}{error && <p className="text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={() => setSkuForm(null)} className="px-4 py-2 text-sm font-semibold text-gray-600">Hủy</button><button disabled={skuMutation.isPending} className="rounded-md bg-orange-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{skuMutation.isPending ? "Đang lưu..." : "Lưu SKU"}</button></div></form></Modal>}
  </div>;
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import adminApi from "../../api/adminApi";
import LoadingState from "../common/LoadingState";

const asList = (value) => value?.results || value || [];
const slugify = (value) => value.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function CatalogManagementPanel() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState({ name: "", parent: "", description: "" });
  const [brand, setBrand] = useState({ name: "", logo_url: "" });
  const [product, setProduct] = useState({ name: "", category: "", brand: "", description: "" });
  const [item, setItem] = useState({ product: "", sku: "", price: "", qty_in_stock: 0, condition: "New" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const brandsQuery = useQuery({ queryKey: ["adminBrands"], queryFn: adminApi.getBrands });
  const categoriesQuery = useQuery({ queryKey: ["adminCategories"], queryFn: adminApi.getCategories });
  const productsQuery = useQuery({ queryKey: ["adminProducts"], queryFn: adminApi.getProducts });
  const brands = asList(brandsQuery.data);
  const categories = asList(categoriesQuery.data);
  const products = asList(productsQuery.data);

  const mutation = useMutation({
    mutationFn: ({ type, payload }) => ({ brand: adminApi.createBrand, category: adminApi.createCategory, product: adminApi.createProduct, item: adminApi.createProductItem }[type])(payload),
    onSuccess: (_, variables) => {
      setError(""); setMessage("Đã lưu dữ liệu thành công.");
      if (variables.type === "brand") { setBrand({ name: "", logo_url: "" }); queryClient.invalidateQueries({ queryKey: ["adminBrands"] }); }
      if (variables.type === "category") { setCategory({ name: "", parent: "", description: "" }); queryClient.invalidateQueries({ queryKey: ["adminCategories"] }); }
      if (variables.type === "product") { setProduct({ name: "", category: "", brand: "", description: "" }); queryClient.invalidateQueries({ queryKey: ["adminProducts"] }); }
      if (variables.type === "item") { setItem({ product: "", sku: "", price: "", qty_in_stock: 0, condition: "New" }); queryClient.invalidateQueries({ queryKey: ["adminProductItems"] }); }
    },
    onError: (requestError) => setError(String((requestError.data && Object.values(requestError.data).flat().find(Boolean)) || requestError.message)),
  });

  if (brandsQuery.isLoading || categoriesQuery.isLoading || productsQuery.isLoading) return <LoadingState message="Đang tải catalog..." />;

  const submit = (event, type, payload) => { event.preventDefault(); setMessage(""); setError(""); mutation.mutate({ type, payload }); };
  const fieldClass = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

  return <div className="space-y-8">
    {(message || error) && <p className={`text-sm ${error ? "text-red-600" : "text-green-700"}`}>{error || message}</p>}
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={(event) => submit(event, "brand", brand)} className="space-y-3 border-b border-gray-200 pb-6"><h2 className="font-bold">Thêm thương hiệu</h2><label className="block text-sm">Tên<input required value={brand.name} onChange={(event) => setBrand((current) => ({ ...current, name: event.target.value }))} className={fieldClass} /></label><label className="block text-sm">Logo URL<input value={brand.logo_url} onChange={(event) => setBrand((current) => ({ ...current, logo_url: event.target.value }))} className={fieldClass} /></label><button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Lưu thương hiệu</button></form>
      <form onSubmit={(event) => submit(event, "category", { ...category, slug: slugify(category.name), parent: category.parent || null })} className="space-y-3 border-b border-gray-200 pb-6"><h2 className="font-bold">Thêm danh mục</h2><label className="block text-sm">Tên<input required value={category.name} onChange={(event) => setCategory((current) => ({ ...current, name: event.target.value }))} className={fieldClass} /></label><label className="block text-sm">Danh mục cha<select value={category.parent} onChange={(event) => setCategory((current) => ({ ...current, parent: event.target.value }))} className={fieldClass}><option value="">Không có</option>{categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><label className="block text-sm">Mô tả<input value={category.description} onChange={(event) => setCategory((current) => ({ ...current, description: event.target.value }))} className={fieldClass} /></label><button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Lưu danh mục</button></form>
      <form onSubmit={(event) => submit(event, "product", { ...product, category: Number(product.category), brand: Number(product.brand), tech_specs: {}, is_active: true })} className="space-y-3 border-b border-gray-200 pb-6"><h2 className="font-bold">Thêm sản phẩm</h2><label className="block text-sm">Tên<input required value={product.name} onChange={(event) => setProduct((current) => ({ ...current, name: event.target.value }))} className={fieldClass} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Danh mục<select required value={product.category} onChange={(event) => setProduct((current) => ({ ...current, category: event.target.value }))} className={fieldClass}><option value="">Chọn</option>{categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><label className="text-sm">Thương hiệu<select required value={product.brand} onChange={(event) => setProduct((current) => ({ ...current, brand: event.target.value }))} className={fieldClass}><option value="">Chọn</option>{brands.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label></div><label className="block text-sm">Mô tả<textarea value={product.description} onChange={(event) => setProduct((current) => ({ ...current, description: event.target.value }))} className={fieldClass} /></label><button className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white">Tạo sản phẩm</button></form>
      <form onSubmit={(event) => submit(event, "item", { ...item, product: Number(item.product), price: String(item.price), qty_in_stock: Number(item.qty_in_stock) })} className="space-y-3 border-b border-gray-200 pb-6"><h2 className="font-bold">Thêm SKU và tồn kho ban đầu</h2><label className="block text-sm">Sản phẩm<select required value={item.product} onChange={(event) => setItem((current) => ({ ...current, product: event.target.value }))} className={fieldClass}><option value="">Chọn</option>{products.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">SKU<input required value={item.sku} onChange={(event) => setItem((current) => ({ ...current, sku: event.target.value }))} className={fieldClass} /></label><label className="text-sm">Giá<input required type="number" min="0" value={item.price} onChange={(event) => setItem((current) => ({ ...current, price: event.target.value }))} className={fieldClass} /></label><label className="text-sm">Tồn kho<input required type="number" min="0" value={item.qty_in_stock} onChange={(event) => setItem((current) => ({ ...current, qty_in_stock: event.target.value }))} className={fieldClass} /></label></div><button className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white">Tạo SKU</button></form>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-y bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-3 py-3">Sản phẩm</th><th>Danh mục</th><th>Thương hiệu</th><th>Trạng thái</th></tr></thead><tbody className="divide-y">{products.map((entry) => <tr key={entry.id}><td className="px-3 py-3 font-semibold">{entry.name}</td><td>{entry.category_name}</td><td>{entry.brand_name}</td><td>{entry.is_active ? "Đang bán" : "Ẩn"}</td></tr>)}</tbody></table></div>
  </div>;
}

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import addressApi from "../api/addressApi";
import LoadingState from "../components/common/LoadingState";

const asList = (value) => value?.results || value || [];
const emptyForm = {
  address_line1: "",
  address_line2: "",
  postal_code: "",
  countryId: "",
  provinceId: "",
  wardId: "",
  is_default: false,
};

const formatAddress = (address) => [
  address.address_line1,
  address.address_line2,
  address.ward?.name,
  address.ward?.district?.city?.province?.name,
  address.postal_code,
].filter(Boolean).join(", ");

const getError = (error) => {
  const detail = error?.data && Object.values(error.data).flat().find(Boolean);
  return String(detail || error?.message || "Không thể lưu địa chỉ.");
};

export default function AddressManagementPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const addressesQuery = useQuery({ queryKey: ["addresses"], queryFn: addressApi.getAddresses });
  const countriesQuery = useQuery({ queryKey: ["countries"], queryFn: addressApi.getCountries });
  const provincesQuery = useQuery({ queryKey: ["provinces", form.countryId], queryFn: () => addressApi.getProvinces(form.countryId), enabled: Boolean(form.countryId) });
  const wardsQuery = useQuery({ queryKey: ["wards", form.provinceId], queryFn: () => addressApi.getWards(form.provinceId), enabled: Boolean(form.provinceId) });

  const addresses = asList(addressesQuery.data);
  const selectGroups = useMemo(() => [
    { key: "countryId", label: "Quốc gia", options: asList(countriesQuery.data), reset: ["provinceId", "wardId"] },
    { key: "provinceId", label: "Tỉnh/Thành", options: asList(provincesQuery.data), reset: ["wardId"] },
    { key: "wardId", label: "Phường/Xã", options: asList(wardsQuery.data), reset: [] },
  ], [countriesQuery.data, provincesQuery.data, wardsQuery.data]);

  const closeForm = () => {
    setEditingId(null);
    setShowForm(false);
    setForm(emptyForm);
    setError("");
  };

  const editAddress = (address) => {
    const district = address.ward?.district;
    const city = district?.city;
    const province = city?.province;
    setForm({
      address_line1: address.address_line1 || "",
      address_line2: address.address_line2 || "",
      postal_code: address.postal_code || "",
      countryId: String(province?.country?.id || ""),
      provinceId: String(province?.id || ""),
      wardId: String(address.ward_id || address.ward?.id || ""),
      is_default: Boolean(address.is_default),
    });
    setEditingId(address.id);
    setShowForm(true);
    setError("");
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => editingId ? addressApi.updateAddress(editingId, payload) : addressApi.createAddress(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      closeForm();
    },
    onError: (requestError) => setError(getError(requestError)),
  });
  const deleteMutation = useMutation({ mutationFn: addressApi.deleteAddress, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }) });
  const defaultMutation = useMutation({ mutationFn: addressApi.setDefault, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }) });

  const submit = (event) => {
    event.preventDefault();
    setError("");
    saveMutation.mutate({
      address_line1: form.address_line1.trim(),
      address_line2: form.address_line2.trim(),
      postal_code: form.postal_code.trim(),
      ward_id: Number(form.wardId),
      is_default: form.is_default,
    });
  };

  if (addressesQuery.isLoading) return <LoadingState message="Đang tải địa chỉ..." />;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">Sổ địa chỉ</h1><p className="mt-1 text-sm text-gray-500">Địa chỉ mặc định được dùng khi thanh toán.</p></div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }} className="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 font-semibold text-white"><Plus className="h-4 w-4" /> Thêm địa chỉ</button>
      </div>
      {addressesQuery.isError && <p className="text-sm text-red-600">Không thể tải danh sách địa chỉ.</p>}
      <div className="divide-y divide-gray-200 border-y border-gray-200">
        {addresses.map((address) => (
          <article key={address.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 text-orange-600" /><div><p className="text-sm font-medium text-gray-900">{formatAddress(address)}</p>{address.is_default && <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-green-700"><Check className="h-3 w-3" /> Mặc định</span>}</div></div>
            <div className="flex shrink-0 gap-2">
              {!address.is_default && <button title="Đặt mặc định" onClick={() => defaultMutation.mutate(address.id)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">Đặt mặc định</button>}
              <button title="Sửa địa chỉ" onClick={() => editAddress(address)} className="rounded-md border border-gray-300 p-2"><Pencil className="h-4 w-4" /></button>
              <button title="Xóa địa chỉ" onClick={() => window.confirm("Xóa địa chỉ này?") && deleteMutation.mutate(address.id)} className="rounded-md border border-red-200 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </article>
        ))}
        {addresses.length === 0 && <p className="py-10 text-center text-sm text-gray-500">Bạn chưa có địa chỉ giao hàng.</p>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <form onSubmit={submit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{editingId ? "Cập nhật địa chỉ" : "Thêm địa chỉ"}</h2><button type="button" title="Đóng" onClick={closeForm} className="p-1"><X className="h-5 w-5" /></button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {selectGroups.map((group) => (
                <label key={group.key} className="text-sm font-medium text-gray-700">{group.label}
                  <select required value={form[group.key]} onChange={(event) => setForm((current) => ({ ...current, [group.key]: event.target.value, ...Object.fromEntries(group.reset.map((key) => [key, ""])) }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
                    <option value="">Chọn {group.label.toLowerCase()}</option>{group.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                </label>
              ))}
              <label className="text-sm font-medium text-gray-700 sm:col-span-2">Địa chỉ cụ thể<input required value={form.address_line1} onChange={(event) => setForm((current) => ({ ...current, address_line1: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="text-sm font-medium text-gray-700">Thông tin bổ sung<input value={form.address_line2} onChange={(event) => setForm((current) => ({ ...current, address_line2: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="text-sm font-medium text-gray-700">Mã bưu chính<input required value={form.postal_code} onChange={(event) => setForm((current) => ({ ...current, postal_code: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_default} onChange={(event) => setForm((current) => ({ ...current, is_default: event.target.checked }))} /> Đặt làm địa chỉ mặc định</label>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeForm} className="rounded-md border border-gray-300 px-4 py-2">Hủy</button><button disabled={saveMutation.isPending} className="rounded-md bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-60">Lưu địa chỉ</button></div>
          </form>
        </div>
      )}
    </main>
  );
}

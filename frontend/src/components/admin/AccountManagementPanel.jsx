import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import adminApi from "../../api/adminApi";
import LoadingState from "../common/LoadingState";

const asList = (value) => value?.results || value || [];

export default function AccountManagementPanel({ type }) {
  const isEmployee = type === "employees";
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ username: "", full_name: "", email: "", phone_number: "", password: "" });
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["adminAccounts", type], queryFn: isEmployee ? adminApi.getEmployees : adminApi.getCustomers });
  const mutation = useMutation({
    mutationFn: ({ action, id, data }) => action === "create" ? (isEmployee ? adminApi.createEmployee(data) : adminApi.createCustomer(data)) : (isEmployee ? adminApi.updateEmployee(id, data) : adminApi.updateCustomer(id, data)),
    onSuccess: () => { setError(""); setForm({ username: "", full_name: "", email: "", phone_number: "", password: "" }); queryClient.invalidateQueries({ queryKey: ["adminAccounts", type] }); },
    onError: (requestError) => setError(String((requestError.data && Object.values(requestError.data).flat().find(Boolean)) || requestError.message)),
  });
  if (query.isLoading) return <LoadingState message="Đang tải tài khoản..." />;
  const accounts = asList(query.data);
  const fieldClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";
  return <div className="space-y-6"><form onSubmit={(event) => { event.preventDefault(); mutation.mutate({ action: "create", data: { ...form, phone_number: form.phone_number || null, is_active: true } }); }} className="grid gap-3 border-b border-gray-200 pb-6 md:grid-cols-5"><input required placeholder="Họ tên" value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} className={fieldClass} /><input placeholder="Username" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} className={fieldClass} /><input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={fieldClass} /><input required type="password" placeholder="Mật khẩu ban đầu" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className={fieldClass} /><button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Tạo {isEmployee ? "nhân viên" : "khách hàng"}</button></form>{error && <p className="text-sm text-red-600">{error}</p>}<div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-y bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-3 py-3">Họ tên</th><th>Email</th><th>Username</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody className="divide-y">{accounts.map((account) => <tr key={account.id}><td className="px-3 py-3 font-semibold">{account.full_name}</td><td>{account.email || "-"}</td><td>{account.username || "-"}</td><td>{account.is_active ? "Hoạt động" : "Đã khóa"}</td><td><button onClick={() => mutation.mutate({ action: "update", id: account.id, data: { is_active: !account.is_active } })} className={`rounded-md border px-3 py-1 text-xs font-semibold ${account.is_active ? "border-red-200 text-red-700" : "border-green-200 text-green-700"}`}>{account.is_active ? "Khóa" : "Mở khóa"}</button></td></tr>)}</tbody></table></div></div>;
}

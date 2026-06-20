import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, LogOut, ShieldAlert } from "lucide-react";
import authApi from "../api/authApi";
import { AuthContext } from "../context/AuthContext";

const errorMessage = (error) => {
  const value = error?.data && Object.values(error.data).flat().find(Boolean);
  return String(value || error?.message || "Không thể hoàn tất thao tác.");
};

export default function AccountSecurityPage() {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const changePassword = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await authApi.changePassword({ old_password: form.oldPassword, new_password: form.newPassword });
      setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Mật khẩu đã được cập nhật.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const logoutAll = async () => {
    setBusy(true);
    try {
      await authApi.logoutAll();
      await logout();
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError));
      setBusy(false);
    }
  };

  const deactivate = async () => {
    if (!window.confirm("Vô hiệu hóa tài khoản? Bạn sẽ bị đăng xuất và không thể đăng nhập lại.")) return;
    setBusy(true);
    try {
      await authApi.softDeleteAccount();
      localStorage.clear();
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(errorMessage(requestError));
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Bảo mật tài khoản</h1>
      <form onSubmit={changePassword} className="space-y-4 border-b border-gray-200 pb-8">
        <h2 className="flex items-center gap-2 font-semibold"><KeyRound className="h-5 w-5" /> Đổi mật khẩu</h2>
        {[{ key: "oldPassword", label: "Mật khẩu hiện tại" }, { key: "newPassword", label: "Mật khẩu mới" }, { key: "confirmPassword", label: "Xác nhận mật khẩu mới" }].map((field) => (
          <label key={field.key} className="block text-sm font-medium text-gray-700">
            {field.label}
            <input required type="password" value={form[field.key]} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
          </label>
        ))}
        {message && <p className="text-sm text-green-700">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="rounded-md bg-gray-900 px-4 py-2 font-semibold text-white disabled:opacity-60">Đổi mật khẩu</button>
      </form>
      <section className="flex flex-wrap gap-3 border-b border-gray-200 py-8">
        <button disabled={busy} onClick={logoutAll} className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 font-semibold"><LogOut className="h-4 w-4" /> Đăng xuất mọi thiết bị</button>
      </section>
      <section className="pt-8">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-red-700"><ShieldAlert className="h-5 w-5" /> Vùng nguy hiểm</h2>
        <button disabled={busy} onClick={deactivate} className="rounded-md border border-red-300 px-4 py-2 font-semibold text-red-700">Vô hiệu hóa tài khoản</button>
      </section>
    </main>
  );
}

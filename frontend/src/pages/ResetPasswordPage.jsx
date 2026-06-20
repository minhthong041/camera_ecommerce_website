import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound, Loader2 } from "lucide-react";
import authApi from "../api/authApi";

const firstError = (error) => {
  const data = error?.data;
  if (data && typeof data === "object") {
    return String(Object.values(data).flat().find(Boolean) || error.message);
  }
  return error?.message || "Không thể đặt lại mật khẩu.";
};

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: searchParams.get("email") || "",
    token: searchParams.get("token") || "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await authApi.confirmPasswordReset({
        email: form.email.trim(),
        token: form.token.trim(),
        new_password: form.newPassword,
      });
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (submitError) {
      setError(firstError(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <KeyRound className="h-6 w-6 text-orange-600" />
          <h1 className="text-2xl font-bold text-gray-900">Đặt lại mật khẩu</h1>
        </div>
        {[{ key: "email", label: "Email", type: "email" }, { key: "token", label: "Token trong email", type: "text" }, { key: "newPassword", label: "Mật khẩu mới", type: "password" }, { key: "confirmPassword", label: "Xác nhận mật khẩu", type: "password" }].map((field) => (
          <label key={field.key} className="block text-sm font-medium text-gray-700">
            {field.label}
            <input
              required
              type={field.type}
              value={form[field.key]}
              onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none"
            />
          </label>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-md bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Cập nhật mật khẩu
        </button>
        <Link to="/login" className="block text-center text-sm font-medium text-gray-600">Quay lại đăng nhập</Link>
      </form>
    </main>
  );
}

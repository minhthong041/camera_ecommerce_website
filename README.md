# Camera Ecommerce Website

Website thương mại điện tử bán máy ảnh theo mô hình B2C, xây dựng với Django REST Framework, React.js và PostgreSQL.

## Tech Stack

- Backend: Django 5, Django REST Framework
- Frontend: React.js, Vite, Axios, TanStack React Query
- Database: PostgreSQL
- Admin: Django Admin

## Project Structure

```text
camera_ecommerce_website/
  backend/
    accounts/
    cart/
    catalog/
    config/
    core/
    locations/
    orders/
    payments/
    promotions/
    reviews/
    wishlist/
    manage.py
    requirements.txt
  frontend/
    src/
    package.json
```

## Backend Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Tạo file `backend/.env` dựa trên mẫu:

```env
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=camera_ecommerce_db
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
```

Tạo database PostgreSQL trong pgAdmin hoặc psql với tên trùng `DB_NAME`, sau đó chạy:

```powershell
python manage.py migrate
python manage.py seed_initial_data --with-demo-catalog
python manage.py seed_vietnam_locations --replace
python manage.py createsuperuser
python manage.py runserver
```

Backend chạy tại:

```text
http://127.0.0.1:8000/
http://127.0.0.1:8000/admin/
```

## Docker Setup

Yêu cầu:

- Docker Desktop
- Docker Compose v2

Tạo file `.env` ở thư mục root dựa trên `.env.example`:

```powershell
copy .env.example .env
```

Chạy toàn bộ stack:

```powershell
docker compose up --build
```

Các service:

```text
Frontend:   http://localhost:5173/
Backend:    http://localhost:8000/
Admin:      http://localhost:8000/admin/
PostgreSQL: localhost:5433
```

Backend container sẽ tự chạy `migrate` trước khi start Django server. Sau khi container đã chạy, seed dữ liệu:

```powershell
docker compose exec backend python manage.py seed_initial_data --with-demo-catalog
docker compose exec backend python manage.py seed_vietnam_locations --replace
```

Tạo superuser:

```powershell
docker compose exec backend python manage.py createsuperuser
```

Dừng stack:

```powershell
docker compose down
```

Dừng và xóa luôn volume database Docker:

```powershell
docker compose down -v
```

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Frontend chạy tại:

```text
http://127.0.0.1:5173/
```

## Seed Data

Lệnh seed dữ liệu nền:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py seed_initial_data
```

Seed thêm dữ liệu catalog demo:

```powershell
.\.venv\Scripts\python.exe manage.py seed_initial_data --with-demo-catalog
```

Dữ liệu seed gồm:

- roles
- order_statuses
- payment_statuses
- payment_methods
- discount_types
- shipping_methods
- brands, categories, variations, variation_options nếu dùng `--with-demo-catalog`

## Useful Commands

```powershell
# Backend checks
cd backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run

# Frontend checks
cd frontend
npm run build
```

## VNPay Sandbox

Đăng ký merchant sandbox và cấu hình các biến sau trong `backend/.env`:

```env
VNPAY_TMN_CODE=<merchant-code>
VNPAY_HASH_SECRET=<hash-secret>
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5173/payment-result
VNPAY_IPN_URL=https://<public-backend>/api/payments/vnpay/ipn/
```

`VNPAY_IPN_URL` phải là HTTPS public để VNPay gọi từ server của họ; localhost chỉ
dùng kiểm thử code. Khai báo URL này trong cấu hình merchant sandbox. Không commit
`TMN_CODE` hoặc `HASH_SECRET` thật vào Git.

## Email

Mặc định development dùng console backend. Để gửi email thật, cấu hình SMTP trong
`backend/.env` (với Gmail nên dùng App Password, không dùng mật khẩu đăng nhập):

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=<smtp-account>
EMAIL_HOST_PASSWORD=<smtp-app-password>
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
DEFAULT_FROM_EMAIL=CameraShop <no-reply@example.com>
FRONTEND_BASE_URL=http://localhost:5173
```

Hệ thống gửi email đăng ký thành công, reset mật khẩu, OTP, xác nhận/cập nhật đơn
hàng và trạng thái yêu cầu đổi trả. Không commit tài khoản hoặc mật khẩu SMTP vào Git.

## Continuous Integration

GitHub Actions workflow nằm tại:

```text
.github/workflows/ci.yml
```

Workflow chạy khi push hoặc tạo Pull Request vào:

```text
main
dev
```

Các job hiện có:

- `Backend`: cài Python dependencies, chạy Django check, kiểm tra migrations, migrate với PostgreSQL service, chạy tests.
- `Frontend`: cài Node dependencies bằng `npm ci`, chạy lint, chạy production build.
- `Docker Compose Config`: kiểm tra cú pháp `docker-compose.yml`.

Sau khi workflow chạy thành công lần đầu trên GitHub, có thể bật ruleset yêu cầu status checks trước khi merge vào `main` hoặc `dev`.

## Git Workflow

Khuyến nghị làm nhóm theo nhánh:

```text
main: code ổn định
dev: nhánh tích hợp
feature/<ten-chuc-nang>: nhánh cho từng chức năng
```

Ví dụ:

```powershell
git checkout -b feature/catalog-api
git add .
git commit -m "Add catalog API"
git push origin feature/catalog-api
```

Sau đó tạo Pull Request vào `dev`.

## Notes

- Không commit `backend/.env`, `frontend/.env`, `.venv`, `node_modules`.
- Không commit root `.env`; chỉ commit `.env.example`.
- Commit migrations Django.
- Database PostgreSQL không nằm trong Git; mỗi thành viên tự tạo DB local và chạy `migrate`.
- Dữ liệu nền được tạo lại bằng management command `seed_initial_data`.
- Địa giới Việt Nam hiện hành được tạo bằng `seed_vietnam_locations --replace`.

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

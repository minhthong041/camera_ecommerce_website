/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#111111',       // Màu đen nền của bncamera
          primary: '#f59e0b',    // Màu vàng cam điểm nhấn
          accent: '#ef4444',     // Màu đỏ cho giá giảm
          light: '#f9fafb'       // Màu nền xám trắng nhẹ
        }
      }
    },
  },
  plugins: [],
}
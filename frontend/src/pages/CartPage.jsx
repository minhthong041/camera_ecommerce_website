import { useState } from "react";
import { Link } from "react-router-dom";

// Dữ liệu ban đầu (chuyển ra ngoài để làm giá trị khởi tạo)
const initialCartItems = [
  {
    id: 1,
    name: "Máy ảnh Sony Alpha a7 IV Body",
    price: 59000000,
    quantity: 1,
    image:
      "https://cdn.vjshop.vn/may-anh/mirrorless/sony/sony-alpha-a7-mark-iv/sony-alpha-a7m4-09-500x500.jpg",
  },
  {
    id: 2,
    name: "Ống kính Canon RF 50mm f/1.8 STM",
    price: 4500000,
    quantity: 2,

    image:
      "https://cdn.vjshop.vn/ong-kinh/mirrorless/canon/canon-rf-50mm-f18/canon-rf-50mm-f18-stm-4-500x500.jpg",
  },
];

const CartPage = () => {
  // 1. Sử dụng useState để quản lý danh sách sản phẩm trong giỏ
  const [cartItems, setCartItems] = useState(initialCartItems);

  // 2. Hàm xử lý: Xóa sản phẩm khỏi giỏ hàng
  const handleRemoveItem = (idToRemove) => {
    // Lọc ra các sản phẩm CÓ ID KHÁC với ID cần xóa
    const updatedCart = cartItems.filter((item) => item.id !== idToRemove);
    setCartItems(updatedCart);
  };

  // 3. Hàm xử lý: Tăng/Giảm số lượng sản phẩm
  const handleUpdateQuantity = (id, change) => {
    const updatedCart = cartItems.map((item) => {
      if (item.id === id) {
        const newQuantity = item.quantity + change;
        // Đảm bảo số lượng không thể giảm xuống dưới 1
        return { ...item, quantity: newQuantity > 0 ? newQuantity : 1 };
      }
      return item;
    });
    setCartItems(updatedCart);
  };

  // 4. Tổng tiền sẽ tự động được tính lại mỗi khi cartItems thay đổi
  const total = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  return (
    <div className="container max-w-6xl px-4 py-12 mx-auto">
      <h1 className="mb-8 text-2xl font-bold text-slate-800">
        Giỏ hàng của bạn
      </h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Danh sách sản phẩm */}
        <div className="w-full lg:w-2/3">
          <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
            {cartItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Giỏ hàng của bạn đang trống.
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center p-6 border-b last:border-b-0"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="object-cover w-24 h-24 rounded-md"
                  />
                  <div className="flex-1 ml-6">
                    <h3 className="text-lg font-medium text-slate-800">
                      {item.name}
                    </h3>
                    <p className="mt-1 font-semibold text-orange-600">
                      {item.price.toLocaleString("vi-VN")} ₫
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    {/* Các nút Tăng/Giảm số lượng đã được gắn sự kiện onClick */}
                    <div className="flex items-center border border-gray-300 rounded">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="px-3 py-1 bg-gray-50 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        value={item.quantity}
                        readOnly
                        className="w-12 text-center border-x"
                      />
                      <button
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="px-3 py-1 bg-gray-50 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                    {/* Nút Xóa đã được gắn sự kiện onClick */}
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-sm font-medium text-red-500 hover:text-red-700 hover:underline"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tóm tắt đơn hàng */}
        <div className="w-full lg:w-1/3">
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h3 className="pb-4 mb-4 text-lg font-bold border-b text-slate-800">
              Tóm tắt đơn hàng
            </h3>
            <div className="flex justify-between mb-4 text-slate-600">
              <span>Tạm tính:</span>
              <span className="font-medium text-slate-800">
                {total.toLocaleString("vi-VN")} ₫
              </span>
            </div>
            <Link to="/checkout" className="block w-full">
              <button
                disabled={cartItems.length === 0}
                className="w-full py-3 mt-4 font-semibold text-white transition duration-200 bg-orange-500 rounded-md hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Tiến hành thanh toán
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;

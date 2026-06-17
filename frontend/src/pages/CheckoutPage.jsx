const mockOrderData = {
  items: [
    { name: "Máy ảnh Sony Alpha a7 IV Body", quantity: 1, price: 59000000 },
    { name: "Ống kính Canon RF 50mm f/1.8 STM", quantity: 2, price: 4500000 },
  ],
  shippingFee: 50000,
};

const CheckoutPage = () => {
  const subTotal = mockOrderData.items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const finalTotal = subTotal + mockOrderData.shippingFee;

  return (
    <div className="container max-w-6xl px-4 py-12 mx-auto">
      <h1 className="mb-8 text-2xl font-bold text-slate-800">
        Thanh toán đơn hàng
      </h1>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Form thông tin */}
        <div className="w-full lg:w-2/3">
          <div className="p-6 bg-white border rounded-lg shadow-sm">
            <h2 className="mb-6 text-lg font-bold text-slate-800">
              Thông tin giao hàng
            </h2>
            <form className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Địa chỉ cụ thể
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 mt-1 border rounded-md focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Ghi chú
                </label>
                <textarea
                  rows="3"
                  className="w-full px-4 py-2 mt-1 border rounded-md resize-none focus:ring-orange-500 focus:border-orange-500"
                ></textarea>
              </div>
            </form>
          </div>
        </div>

        {/* Khối tóm tắt */}
        <div className="w-full lg:w-1/3">
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
            <h3 className="pb-4 mb-4 text-lg font-bold border-b border-slate-200 text-slate-800">
              Đơn hàng của bạn
            </h3>
            <div className="space-y-4">
              {mockOrderData.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="pr-4 text-slate-600 line-clamp-2">
                    {item.name}{" "}
                    <span className="font-medium text-slate-800">
                      x{item.quantity}
                    </span>
                  </span>
                  <span className="font-medium whitespace-nowrap text-slate-800">
                    {(item.price * item.quantity).toLocaleString("vi-VN")} ₫
                  </span>
                </div>
              ))}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex justify-between mb-2 text-sm text-slate-600">
                  <span>Tạm tính</span>
                  <span className="font-medium text-slate-800">
                    {subTotal.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
                <div className="flex justify-between mb-2 text-sm text-slate-600">
                  <span>Phí vận chuyển</span>
                  <span className="font-medium text-slate-800">
                    {mockOrderData.shippingFee.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
                <div className="flex justify-between pt-4 mt-4 text-lg font-bold border-t border-slate-200">
                  <span className="text-slate-800">Tổng cộng</span>
                  <span className="text-orange-600">
                    {finalTotal.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
              </div>
            </div>
            <button className="w-full py-3 mt-6 font-semibold text-white transition duration-200 rounded-md bg-slate-800 hover:bg-slate-900">
              Đặt hàng ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

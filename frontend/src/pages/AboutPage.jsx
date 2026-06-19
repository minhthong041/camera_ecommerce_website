const AboutPage = () => {
  return (
    <div className="container max-w-4xl px-4 py-16 mx-auto">
      <div className="text-center mb-12">
        <h1 className="mb-4 text-4xl font-black text-slate-800">
          Về <span className="text-orange-500">Camera Shop</span>
        </h1>
        <p className="text-lg text-gray-500">
          Đồng hành cùng đam mê nhiếp ảnh của bạn
        </p>
      </div>

      <div className="p-8 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-6 text-slate-700 leading-relaxed">
        <p>
          Chào mừng bạn đến với <strong>Camera Shop</strong> – điểm đến tin cậy của cộng đồng yêu nhiếp ảnh! Được thành lập với niềm đam mê mãnh liệt dành cho nghệ thuật thu nhiếp ánh sáng, chúng tôi tự hào là hệ thống phân phối thiết bị máy ảnh, ống kính và phụ kiện chính hãng hàng đầu.
        </p>
        
        <p>
          Dù bạn là một người mới bắt đầu làm quen với ống kính hay một nhiếp ảnh gia chuyên nghiệp đang tìm kiếm những thiết bị tối tân nhất, Camera Shop luôn có sẵn một hệ sinh thái sản phẩm đa dạng từ các thương hiệu danh tiếng như <strong>Sony, Canon, Nikon, Fujifilm...</strong> để đáp ứng trọn vẹn mọi nhu cầu sáng tạo.
        </p>

        <p>
          Chúng tôi hiểu rằng, một chiếc máy ảnh không chỉ là công cụ, mà còn là người bạn đồng hành lưu giữ những khoảnh khắc vô giá. Vì vậy, hơn cả một nền tảng thương mại điện tử, Camera Shop cam kết mang đến:
        </p>

        <ul className="pl-6 space-y-2 list-disc marker:text-orange-500">
          <li><strong>Sản phẩm chính hãng 100%</strong> với nguồn gốc xuất xứ rõ ràng.</li>
          <li>Chính sách bảo hành minh bạch và hậu mãi tận tâm.</li>
          <li>Dịch vụ <strong>"Thu cũ đổi mới"</strong> linh hoạt, giúp bạn dễ dàng lên đời thiết bị với chi phí tối ưu nhất.</li>
          <li>Đội ngũ tư vấn viên am hiểu kỹ thuật, luôn sẵn sàng hỗ trợ và chia sẻ kiến thức.</li>
        </ul>

        <p className="pt-4 font-medium text-center text-slate-800">
          Cảm ơn bạn đã lựa chọn Camera Shop. Hãy để chúng tôi cùng bạn kiến tạo nên những khung hình tuyệt đẹp!
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
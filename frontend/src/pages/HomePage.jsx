import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, RefreshCw, BadgePercent } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="pb-16">
      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white py-24 md:py-36 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1495707902641-75cac588d2e9?w=1600')] bg-cover bg-center opacity-25"></div>
        <div className="container mx-auto relative z-10 max-w-3xl text-center">
          <span className="text-amber-500 text-xs font-bold uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full">
            CAMERA SHOP - Chuyên nghiệp & Uy tín
          </span>
          <h1 className="text-3xl sm:text-5xl font-black mt-6 tracking-tight leading-none uppercase">
            Máy Ảnh Cao Cấp <br />
            <span className="text-amber-500">& Ống Kính Chính Hãng</span>
          </h1>
          <p className="mt-4 text-gray-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Hệ sinh thái thiết bị ngành ảnh phục vụ từ chụp nghiệp dư đến chuyên nghiệp. Thu cũ đổi mới lên đời nhanh chóng với ưu đãi hàng đầu.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/products" className="bg-amber-500 hover:bg-amber-400 text-gray-900 px-7 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all transform hover:-translate-y-0.5">
              Khám phá sản phẩm ngay <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Commitments Section */}
      <section className="container mx-auto px-4 -mt-10 relative z-20 max-w-6xl">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-center gap-4">
            <div className="bg-amber-50 p-3 rounded-xl"><ShieldCheck className="w-8 h-8 text-amber-500" /></div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Bảo hành dài hạn</h4>
              <p className="text-xs text-gray-500 mt-0.5">Cam kết chính hãng, bảo hành lên tới 24 tháng.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 border-y md:border-y-0 md:border-x border-gray-100 md:px-6">
            <div className="bg-amber-50 p-3 rounded-xl"><RefreshCw className="w-8 h-8 text-amber-500" /></div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Thu cũ đổi mới</h4>
              <p className="text-xs text-gray-500 mt-0.5">Định giá máy cũ cao, hỗ trợ lên đời siêu tốc.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-amber-50 p-3 rounded-xl"><BadgePercent className="w-8 h-8 text-amber-500" /></div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Trả góp lãi suất 0%</h4>
              <p className="text-xs text-gray-500 mt-0.5">Hỗ trợ trả góp nhanh qua thẻ tín dụng.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="container mx-auto px-4 mt-20 max-w-7xl">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Danh mục thiết bị</h2>
            <p className="text-xs text-gray-400 mt-1">Lựa chọn giải pháp phù hợp với đam mê của bạn</p>
          </div>
          <Link to="/products" className="text-amber-500 font-bold text-xs hover:underline flex items-center gap-1">
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { title: 'Máy Ảnh Mirrorless', img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600' },
            { title: 'Ống Kính / Lenses', img: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=600' },
            { title: 'Phụ Kiện Studio', img: 'https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=600' }
          ].map((cat, i) => (
            <div key={i} className="relative rounded-2xl overflow-hidden h-56 group cursor-pointer bg-gray-950 shadow-md">
              <div className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:scale-105 transition-transform duration-700" style={{ backgroundImage: `url('${cat.img}')` }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
              <div className="absolute inset-0 flex flex-col justify-end p-6 z-20">
                <h3 className="text-white font-black text-lg tracking-tight uppercase">{cat.title}</h3>
                <span className="text-amber-400 text-xs font-bold mt-1 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Khám phá ngay <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
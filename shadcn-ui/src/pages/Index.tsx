import { ShoppingCart, MessageCircle } from "lucide-react";

const products = [
  "Benih Cabe Oriental Seed",
  "Benih Kubis Greennova",
  "Fungisida Mantep 80 WP",
  "Fungisida Manzate 82 WP",
  "Maher",
  "Cabriotop",
  "Raban",
  "Tridex",
  "Antila",
  "Cadilac",
  "Brofeya",
  "Gracia",
  "Dimodis",
  "Rizotin",
];

export default function Index() {
  return (
    <main className="min-h-screen bg-white text-gray-800">
      {/* HERO */}
      <section className="bg-green-700 text-white py-20 text-center px-6">
        <h1 className="text-4xl md:text-5xl font-bold">
          Toko Tani Online
        </h1>
        <p className="mt-4 text-lg md:text-xl">
          Pusat Benih & Sarana Pertanian Terpercaya untuk Petani Indonesia
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#produk"
            className="bg-white text-green-700 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            <ShoppingCart size={18} />
            Lihat Produk
          </a>

          <a
            href="https://wa.me/628000000000"
            target="_blank"
            className="border border-white px-6 py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <MessageCircle size={18} />
            Konsultasi WhatsApp
          </a>
        </div>
      </section>

      {/* PRODUK */}
      <section id="produk" className="container mx-auto py-16 px-6">
        <h2 className="text-3xl font-semibold text-center mb-10">
          Produk Unggulan
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products.map((item) => (
            <div
              key={item}
              className="border rounded-xl p-6 shadow hover:shadow-lg transition"
            >
              <h3 className="font-semibold text-lg mb-4">{item}</h3>

              <div className="flex flex-col gap-3">
                <a
                  href="https://shopee.co.id"
                  target="_blank"
                  className="bg-orange-500 text-white text-center py-2 rounded"
                >
                  Beli di Shopee
                </a>

                <a
                  href="https://tokopedia.com"
                  target="_blank"
                  className="bg-green-600 text-white text-center py-2 rounded"
                >
                  Beli di Tokopedia
                </a>

                <a
                  href="https://wa.me/628000000000"
                  target="_blank"
                  className="border border-green-600 text-green-700 text-center py-2 rounded"
                >
                  Pesan via WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-100 py-6 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} Toko Tani Online · Semua Hak Dilindungi
      </footer>
    </main>
  );
}

/* =====================================================
   main.js - Trang chủ GREEN SOIL
   Chức năng: đọc dữ liệu từ Supabase (do trang admin nhập)
   và hiển thị Giới thiệu, sản phẩm, nội dung trang (đã bỏ giỏ hàng)
   ===================================================== */

/* ---------- 1. KẾT NỐI SUPABASE ---------- */
// Dùng đúng project giống admin.js để đọc cùng dữ liệu
const SUPABASE_URL = 'https://aynmosrddjceqexblqeo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_T7sRdOKCm3ZKQJZWyGxMmg_5XB1yE59';
// db sẽ được tạo sau khi thư viện Supabase tải xong
let db;

// Đảm bảo thư viện Supabase đã có. Nếu index.html quên nạp (hoặc nạp sau main.js)
// thì tự động nạp thêm từ CDN, tránh lỗi "supabase is not defined"
function ensureSupabaseLib() {
  return new Promise((resolve, reject) => {
    // Nếu thư viện đã có sẵn thì dùng luôn
    if (window.supabase && window.supabase.createClient) return resolve();
    // Chưa có thì tạo thẻ script để tải từ CDN
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = resolve;                         // tải xong -> báo thành công
    s.onerror = () => reject(new Error('Không tải được thư viện Supabase (kiểm tra mạng)'));
    document.head.appendChild(s);
  });
}

/* ---------- 2. HÀM TIỆN ÍCH ---------- */
// Chống chèn mã độc: đổi ký tự đặc biệt thành chữ thường trước khi đưa vào HTML
function esc(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';                 // gán dạng văn bản thuần
  return div.innerHTML;                         // lấy lại dạng đã được mã hóa an toàn
}

// Định dạng giá tiền kiểu Việt Nam: 150000 -> 150.000đ
function formatPrice(n) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

// Ảnh dự phòng khi sản phẩm không có ảnh
const PLACEHOLDER_IMG = 'https://placehold.co/300x300?text=Green+Soil';

/* ---------- 3. NỘI DUNG TRANG (Liên hệ, hotline, địa chỉ...) ---------- */
// Lấy bảng site_content (cột key, value) rồi gán vào các thẻ có data-content
async function loadSiteContent() {
  const { data, error } = await db.from('site_content').select('key, value');
  if (error) return console.error('Lỗi tải nội dung:', error.message);

  data.forEach(row => {
    // Tìm mọi thẻ có data-content trùng key và gán chữ vào
    document.querySelectorAll(`[data-content="${row.key}"]`).forEach(el => {
      el.textContent = row.value;
    });
  });
}

/* ---------- 3B. PHẦN GIỚI THIỆU (chuyển từ gioi-thieu.html sang) ---------- */
// Nội dung mặc định: hiện khi admin chưa nhập hoặc chưa tải được dữ liệu
const ABOUT_DEFAULTS = {
  about_banner_title: 'Green Soil - Đất sinh học cho khu vườn xanh',
  about_banner_subtitle: 'Nuôi dưỡng cây trồng bằng sự tử tế với thiên nhiên.',
  about_banner_btn_text: 'Xem sản phẩm',
  about_banner_btn_link: '#san-pham',
  about_story_title: 'Câu chuyện của chúng tôi',
  about_story_text: 'Green Soil bắt đầu từ mong muốn mang lại loại đất sạch, giàu dinh dưỡng cho mọi khu vườn.',
  about_values_title: 'Giá trị cốt lõi',
  about_v1_icon: '🌱', about_v1_title: 'Tự nhiên',   about_v1_desc: 'Nguyên liệu hữu cơ, an toàn cho cây và người.',
  about_v2_icon: '✅', about_v2_title: 'Chất lượng', about_v2_desc: 'Kiểm soát chặt chẽ từng lô sản phẩm.',
  about_v3_icon: '♻️', about_v3_title: 'Bền vững',   about_v3_desc: 'Hướng tới canh tác thân thiện với môi trường.'
};

// Chỉ cho phép link an toàn (chặn javascript:)
function safeLink(u) {
  return /^\s*javascript:/i.test(u || '') ? '#' : u;
}

// Vẽ phần Giới thiệu. rows = dữ liệu dạng {key: value}
// fromServer = true khi dữ liệu lấy từ Supabase (dùng để cập nhật bộ nhớ đệm banner)
function renderAbout(rows, fromServer) {
  // Trang nào không có phần Giới thiệu (ví dụ trang khác dùng chung main.js) thì bỏ qua
  const hero = document.getElementById('gt-hero');
  if (!hero) return;

  // Lấy giá trị theo khóa; nếu trống thì dùng nội dung mặc định
  const get = k => ((rows[k] || '').trim()) || ABOUT_DEFAULTS[k] || '';

  // Gán chữ vào mọi thẻ có data-about (dùng textContent nên không bị chèn mã độc)
  document.querySelectorAll('[data-about]').forEach(el => {
    el.textContent = get(el.dataset.about);
  });

  // Nút banner: gán link đã lọc an toàn
  const btn = document.getElementById('gt-btn');
  if (btn) btn.href = safeLink(get('about_banner_btn_link'));

  // Ảnh nền banner giới thiệu
  const bg = (rows.about_banner_image || '').trim();
  if (bg) {
    const url = encodeURI(bg);
    hero.style.backgroundImage = `url("${url}")`;
    // Lưu lại để lần sau hiện banner ngay lập tức
    if (fromServer) { try { localStorage.setItem('gt_banner_url', url); } catch (e) {} }
  } else if (fromServer) {
    // Admin đã xóa ảnh banner -> xóa bộ nhớ đệm và bỏ ảnh cũ
    try { localStorage.removeItem('gt_banner_url'); } catch (e) {}
    hero.style.backgroundImage = '';
  }

  // Ảnh câu chuyện: có ảnh thì chia 2 cột, không có thì chỉ hiện chữ ở giữa
  const img = document.getElementById('gt-story-img');
  const src = (rows.about_story_image || '').trim();
  if (img && src) {
    img.src = src;
    img.style.display = 'block';
    const story = document.getElementById('gt-story');
    if (story) story.classList.remove('no-img');
  }
}

// Tải nội dung Giới thiệu thật từ Supabase (các dòng có key bắt đầu bằng about_)
async function loadAbout() {
  // Không có phần Giới thiệu trong trang thì khỏi tải
  if (!document.getElementById('gt-hero')) return;

  const { data, error } = await db
    .from('site_content')
    .select('key, value')
    .like('key', 'about_%');
  if (error) return console.error('Lỗi tải phần giới thiệu:', error.message);

  // Chuyển danh sách dòng thành object {key: value}
  const rows = {};
  data.forEach(r => { rows[r.key] = r.value; });
  renderAbout(rows, true);
}

/* ---------- 4. SẢN PHẨM ---------- */
let products = []; // lưu danh sách sản phẩm sau khi tải về

async function loadProducts() {
  // Tìm khung chứa danh sách sản phẩm trong index.html
  const box = document.getElementById('product-list');
  if (!box) return console.error('Không tìm thấy thẻ có id="product-list" trong index.html');

  // Lấy các sản phẩm đang hiển thị, mới nhất lên trước
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('is_active', true)          // bỏ dòng này nếu bảng chưa có cột is_active
    .order('created_at', { ascending: false });

  // Lỗi thì báo cho người xem và ghi log để kiểm tra
  if (error) {
    box.innerHTML = '<p>Không tải được sản phẩm.</p>';
    return console.error('Lỗi tải sản phẩm:', error.message);
  }
  products = data;                              // lưu lại danh sách sản phẩm
  renderProducts();                             // vẽ ra màn hình
}

// Vẽ thẻ sản phẩm (ảnh trái, thông tin phải, có nhãn)
function renderProducts() {
  const box = document.getElementById('product-list');
  if (!box) return;
  // Chưa có sản phẩm nào thì hiện thông báo
  if (!products.length) {
    box.innerHTML = '<p>Chưa có sản phẩm.</p>';
    return;
  }
  // Với mỗi sản phẩm, tạo một thẻ HTML rồi nối tất cả lại
  box.innerHTML = products.map(p => `
    <div class="product-card" style="display:flex;gap:24px;margin-bottom:24px;align-items:center;">
      <!-- Ảnh sản phẩm: bấm vào để sang trang chi tiết -->
      <a href="product.html?id=${p.id}">
        <img src="${esc(p.image_url) || PLACEHOLDER_IMG}"
             alt="${esc(p.name)}" style="width:300px;max-width:100%;border-radius:12px;">
      </a>
      <div class="product-info">
        <!-- Nhãn (Mới / Bán chạy) nếu có -->
        ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}
        <!-- Tên sản phẩm: bấm vào để sang trang chi tiết -->
        <h3><a href="product.html?id=${p.id}">${esc(p.name)}</a></h3>
        <!-- Mô tả ngắn -->
        <p>${esc(p.description)}</p>
        <!-- Giá tiền -->
        <strong>${formatPrice(p.price)}</strong>
        <!-- ĐÃ XÓA: ô chọn số lượng và nút "Thêm vào giỏ" -->
      </div>
    </div>
  `).join('');
}

/* ---------- 5. KHỞI ĐỘNG KHI TRANG TẢI XONG ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  // Vẽ nội dung Giới thiệu mặc định ngay, tránh phần này bị trống trong lúc chờ Supabase
  renderAbout({}, false);

  // Đảm bảo có thư viện Supabase rồi mới kết nối database
  try {
    await ensureSupabaseLib();
  } catch (err) {
    return console.error(err.message);
  }
  // Tạo kết nối database
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  loadSiteContent();      // nạp Liên hệ / hotline / địa chỉ
  loadAbout();            // MỚI: nạp phần Giới thiệu
  loadProducts();         // nạp sản phẩm
});
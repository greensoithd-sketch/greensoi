// ===== Kết nối Supabase (PHẢI đặt trên cùng, trước mọi chỗ dùng db) =====
const SUPABASE_URL = 'https://aynmosrddjceqexblqeo.supabase.co';        // Project URL
const SUPABASE_KEY = 'sb_publishable_T7sRdOKCm3ZKQJZWyGxMmg_5XB1yE59';   // anon/publishable key
// Tạo client dùng cho database, đăng nhập, storage
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== Lấy các phần tử trên trang =====
const loginBox = document.getElementById('loginBox'); // khung đăng nhập
const app = document.getElementById('app');           // khu quản trị
const content = document.getElementById('content');   // vùng nội dung bên phải
const loginMsg = document.getElementById('loginMsg'); // dòng báo lỗi đăng nhập

// Hàm định dạng tiền: 45000 -> 45.000đ
const money = n => Number(n).toLocaleString('vi-VN') + 'đ';

// Hàm chống chèn mã HTML độc hại khi hiển thị dữ liệu người dùng nhập
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ===== Kiểm tra quyền admin =====
// Trả về true nếu user đang đăng nhập có trong bảng admins, ngược lại trả về false
async function guardAdmin() {
  // Lấy phiên đăng nhập hiện tại
  const { data: { session } } = await db.auth.getSession();

  // Chưa đăng nhập thì không phải admin
  if (!session) return false;

  // Tìm user này trong bảng admins
  const { data } = await db.from('admins')
    .select('user_id').eq('user_id', session.user.id).maybeSingle();

  // Không có trong bảng admins thì đăng xuất, báo lỗi và trả về false
  if (!data) {
    await db.auth.signOut();
    loginMsg.textContent = 'Tài khoản này không có quyền quản trị';
    return false;
  }
  return true;
}

// ===== Đăng nhập / đăng xuất =====
document.getElementById('btnLogin').onclick = async () => {
  // Gửi email + mật khẩu lên Supabase
  const { error } = await db.auth.signInWithPassword({
    email: document.getElementById('email').value,
    password: document.getElementById('password').value
  });
  if (error) {
    loginMsg.textContent = 'Sai email hoặc mật khẩu';
    return;
  }
  loginMsg.textContent = '';
  // Đăng nhập đúng thì còn phải là admin mới được vào
  if (await guardAdmin()) showApp();
};

document.getElementById('btnLogout').onclick = async () => {
  await db.auth.signOut(); // đăng xuất
  location.reload();       // tải lại trang để về màn hình đăng nhập
};

// Khi mở trang: nếu đã đăng nhập từ trước (và là admin) thì vào thẳng khu quản trị
async function init() {
  if (await guardAdmin()) showApp();
}

// Ẩn khung đăng nhập, hiện khu quản trị, mở tab Sản phẩm đầu tiên
function showApp() {
  loginBox.classList.add('hidden');
  app.classList.remove('hidden');
  openTab('products');
}
init();

// ===== Chuyển tab trong menu trái =====
document.querySelectorAll('.sidebar a').forEach(a => {
  a.onclick = e => {
    e.preventDefault(); // chặn link nhảy lên đầu trang
    // Bỏ trạng thái "active" ở tất cả tab rồi gán cho tab vừa bấm
    document.querySelectorAll('.sidebar a').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    openTab(a.dataset.tab);
  };
});

// Mở tab theo tên: gọi hàm vẽ giao diện tương ứng
function openTab(tab) {
  if (tab === 'products') renderProducts();
  if (tab === 'about') renderAboutEditor();
  if (tab === 'contact') renderContact();
  if (tab === 'orders') renderOrders();
}

// ===== TAB 1: SẢN PHẨM =====
// Vẽ bảng danh sách sản phẩm
async function renderProducts() {
  // Lấy tất cả sản phẩm, mới nhất lên đầu
  const { data: list } = await db.from('products').select('*').order('created_at', { ascending: false });
  content.innerHTML = `
    <h2>Sản phẩm</h2>
    <button id="btnAdd">+ Thêm sản phẩm</button><br><br>
    <table>
      <tr><th>Ảnh</th><th>Tên</th><th>Giá</th><th>Nhãn</th><th>Trạng thái</th><th></th></tr>
      ${(list || []).map(p => `
        <tr>
          <td>${p.image_url ? `<img src="${esc(p.image_url)}">` : ''}</td>
          <td>${esc(p.name)}</td>
          <td>${money(p.price)}</td>
          <td>${esc(p.badge)}</td>
          <td>${p.is_active ? 'Đang bán' : 'Đã ẩn'}</td>
          <td>
            <button onclick="editProduct('${p.id}')">Sửa</button>
            <button class="danger" onclick="deleteProduct('${p.id}')">Xóa</button>
          </td>
        </tr>`).join('')}
    </table>`;
  // Bấm "Thêm sản phẩm" thì mở form trống
  document.getElementById('btnAdd').onclick = () => productForm();
}

// Mở form sửa: lấy dữ liệu sản phẩm rồi đưa vào form
async function editProduct(id) {
  const { data } = await db.from('products').select('*').eq('id', id).single();
  productForm(data);
}

// Form thêm / sửa sản phẩm (p = null nghĩa là thêm mới)
function productForm(p = null) {
  content.innerHTML = `
    <h2>${p ? 'Sửa' : 'Thêm'} sản phẩm</h2>
    <div class="card">
      <label>Tên sản phẩm</label><input id="pName" value="${esc(p?.name)}">
      <label>Giá (đồng)</label><input id="pPrice" type="number" value="${p?.price ?? ''}">
      <label>Mô tả ngắn</label><textarea id="pDesc" rows="3">${esc(p?.description)}</textarea>
      <label>Nhãn</label>
      <select id="pBadge">
        <option value="">Không có</option>
        <option ${p?.badge === 'Mới' ? 'selected' : ''}>Mới</option>
        <option ${p?.badge === 'Bán chạy' ? 'selected' : ''}>Bán chạy</option>
      </select>
      <label>Ảnh: dán link</label><input id="pImgUrl" value="${esc(p?.image_url)}">
      <label>Hoặc tải ảnh từ máy lên (ưu tiên hơn link)</label><input id="pImgFile" type="file" accept="image/*">
      <label><input id="pActive" type="checkbox" style="width:auto" ${p?.is_active === false ? '' : 'checked'}> Đang bán</label><br><br>
      <button id="btnSave">Lưu</button>
      <button class="gray" onclick="renderProducts()">Hủy</button>
      <p id="pMsg" class="msg"></p>
    </div>`;

  // Xử lý khi bấm nút Lưu
  document.getElementById('btnSave').onclick = async () => {
    let imageUrl = document.getElementById('pImgUrl').value.trim();

    // Nếu chọn file thì tải lên Supabase Storage rồi lấy link công khai
    const file = document.getElementById('pImgFile').files[0];
    if (file) {
      // Tạo tên file an toàn (bỏ ký tự lạ) + thêm thời gian để không bị trùng
      const path = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const { error } = await db.storage.from('products').upload(path, file);
      if (error) { document.getElementById('pMsg').textContent = 'Lỗi tải ảnh: ' + error.message; return; }
      imageUrl = db.storage.from('products').getPublicUrl(path).data.publicUrl;
    }

    // Gom dữ liệu từ form
    const row = {
      name: document.getElementById('pName').value.trim(),
      price: Number(document.getElementById('pPrice').value) || 0,
      description: document.getElementById('pDesc').value.trim(),
      badge: document.getElementById('pBadge').value || null,
      image_url: imageUrl,
      is_active: document.getElementById('pActive').checked
    };
    // Bắt buộc phải có tên
    if (!row.name) { document.getElementById('pMsg').textContent = 'Vui lòng nhập tên'; return; }

    // Có p thì cập nhật, không có thì thêm mới
    const { error } = p
      ? await db.from('products').update(row).eq('id', p.id)
      : await db.from('products').insert(row);
    if (error) document.getElementById('pMsg').textContent = error.message; // báo lỗi
    else renderProducts();                                                   // thành công thì về danh sách
  };
}

// Xóa sản phẩm (có hỏi xác nhận trước)
async function deleteProduct(id) {
  if (!confirm('Xóa sản phẩm này?')) return;
  await db.from('products').delete().eq('id', id);
  renderProducts();
}

// ===== TAB 2: GIỚI THIỆU (Banner + Câu chuyện + 3 thẻ giá trị) =====
async function renderAboutEditor() {
  // Lấy tất cả mục about_* trong bảng site_content
  const { data } = await db.from('site_content').select('key, value').like('key', 'about_%');
  const rows = {};
  (data || []).forEach(r => { rows[r.key] = r.value; });
  const v = k => esc(rows[k]);   // lấy giá trị theo key, đã chống chèn HTML

  // Ô chọn ảnh: dán link hoặc tải từ máy lên, kèm ảnh xem trước
  const imgField = (key, label) => `
    <label>${label}</label>
    ${rows[key] ? `<img class="about-prev" src="${v(key)}">` : ''}
    <input data-key="${key}" value="${v(key)}" placeholder="Dán link ảnh...">
    <input type="file" accept="image/*" data-file-for="${key}">`;

  content.innerHTML = `
    <h2>Giới thiệu</h2>
    <p style="margin-bottom:14px"><a href="gioi-thieu.html" target="_blank">Xem trang Giới thiệu ↗</a></p>

    <div class="card wide">
      <h3>1. Banner</h3>
      <label>Tiêu đề</label><input data-key="about_banner_title" value="${v('about_banner_title')}">
      <label>Slogan</label><input data-key="about_banner_subtitle" value="${v('about_banner_subtitle')}">
      ${imgField('about_banner_image', 'Ảnh nền banner (để trống = nền xanh lá)')}
      <label>Chữ trên nút</label><input data-key="about_banner_btn_text" value="${v('about_banner_btn_text')}">
      <label>Link của nút (vd: index.html#san-pham)</label><input data-key="about_banner_btn_link" value="${v('about_banner_btn_link')}">
    </div>

    <div class="card wide">
      <h3>2. Câu chuyện thương hiệu</h3>
      <label>Tiêu đề</label><input data-key="about_story_title" value="${v('about_story_title')}">
      <label>Nội dung (xuống dòng để tách đoạn)</label>
      <textarea data-key="about_story_text" rows="8">${v('about_story_text')}</textarea>
      ${imgField('about_story_image', 'Ảnh minh họa (để trống = chỉ hiện chữ)')}
    </div>

    <div class="card wide">
      <h3>3. Giá trị cốt lõi</h3>
      <label>Tiêu đề mục</label><input data-key="about_values_title" value="${v('about_values_title')}">
      <div class="about-grid">
        ${[1, 2, 3].map(n => `
          <div class="about-box">
            <b>Thẻ ${n}</b>
            <label>Icon (emoji)</label><input data-key="about_v${n}_icon" value="${v('about_v' + n + '_icon')}">
            <label>Tiêu đề</label><input data-key="about_v${n}_title" value="${v('about_v' + n + '_title')}">
            <label>Mô tả ngắn</label><textarea data-key="about_v${n}_desc" rows="3">${v('about_v' + n + '_desc')}</textarea>
          </div>`).join('')}
      </div>
    </div>

    <button id="btnSaveAbout">Lưu tất cả</button>
    <p id="aboutMsg" class="msg"></p>`;

  // Bấm Lưu: tải ảnh mới (nếu có) rồi ghi tất cả mục vào site_content
  const btn = document.getElementById('btnSaveAbout');
  const msg = document.getElementById('aboutMsg');
  btn.onclick = async () => {
    btn.disabled = true;
    msg.style.color = '#555';
    msg.textContent = 'Đang lưu...';
    try {
      // 1. Ảnh chọn từ máy: tải lên bucket "products", lấy link điền vào ô link
      for (const f of content.querySelectorAll('[data-file-for]')) {
        const file = f.files[0];
        if (!file) continue;
        const path = 'about/' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const { error } = await db.storage.from('products').upload(path, file);
        if (error) throw new Error('Lỗi tải ảnh: ' + error.message);
        content.querySelector(`[data-key="${f.dataset.fileFor}"]`).value =
          db.storage.from('products').getPublicUrl(path).data.publicUrl;
      }
      // 2. Gom mọi ô có data-key rồi lưu một lần (upsert: có rồi thì cập nhật, chưa có thì thêm)
      const out = [...content.querySelectorAll('[data-key]')]
        .map(el => ({ key: el.dataset.key, value: el.value.trim() }));
      const { error } = await db.from('site_content').upsert(out);
      if (error) throw new Error(error.message);
      msg.style.color = '#2e7d32';
      msg.textContent = 'Đã lưu';
    } catch (e) {
      msg.style.color = '#c62828';
      msg.textContent = e.message;
    }
    btn.disabled = false;
  };
}

// ===== TAB 3: LIÊN HỆ (nội dung + hotline + địa chỉ + email + Zalo + Facebook + tin nhắn khách) =====
async function renderContact() {
  // Lấy 6 mục thông tin liên hệ từ site_content
  const { data } = await db.from('site_content').select('*')
    .in('key', ['contact', 'hotline', 'address', 'contact_email', 'contact_zalo', 'contact_facebook']);
  // Hàm nhỏ: lấy giá trị theo khóa (đã chống chèn HTML)
  const v = k => esc((data || []).find(x => x.key === k)?.value);
  content.innerHTML = `
    <h2>Liên hệ</h2>
    <div class="card">
      <label>Nội dung trang Liên hệ</label><textarea id="cContact" rows="6">${v('contact')}</textarea>
      <label>Hotline (hiện ở footer và trang Liên hệ)</label><input id="cHotline" value="${v('hotline')}">
      <label>Địa chỉ (hiện ở footer và trang Liên hệ)</label><input id="cAddress" value="${v('address')}">
      <label>Email liên hệ</label><input id="cEmail" value="${v('contact_email')}">
      <label>Link Zalo (bắt đầu bằng https://)</label><input id="cZalo" value="${v('contact_zalo')}" placeholder="https://zalo.me/...">
      <label>Link Facebook (bắt đầu bằng https://)</label><input id="cFacebook" value="${v('contact_facebook')}" placeholder="https://facebook.com/...">
      <button id="btnSaveC">Lưu</button>
      <p id="cMsg" class="msg"></p>
    </div>

    <h3 style="margin-top:28px">Tin nhắn từ khách</h3>
    <div id="contactMessages">Đang tải...</div>`;

  // Lưu cả 6 mục cùng lúc
  document.getElementById('btnSaveC').onclick = async () => {
    const { error } = await db.from('site_content').upsert([
      { key: 'contact', value: document.getElementById('cContact').value },
      { key: 'hotline', value: document.getElementById('cHotline').value },
      { key: 'address', value: document.getElementById('cAddress').value },
      { key: 'contact_email', value: document.getElementById('cEmail').value.trim() },
      { key: 'contact_zalo', value: document.getElementById('cZalo').value.trim() },
      { key: 'contact_facebook', value: document.getElementById('cFacebook').value.trim() }
    ]);
    document.getElementById('cMsg').textContent = error ? error.message : 'Đã lưu';
  };

  // Tải danh sách tin nhắn khách gửi từ trang liên hệ
  loadContactMessages();
}

// Vẽ bảng tin nhắn khách gửi (tin mới nhất lên đầu, tin chưa đọc tô nền xanh nhạt)
async function loadContactMessages() {
  const box = document.getElementById('contactMessages');
  if (!box) return; // không còn ở tab Liên hệ thì thôi

  const { data: msgs, error } = await db.from('contact_messages')
    .select('*').order('created_at', { ascending: false });

  // Báo lỗi hoặc báo chưa có tin nhắn nào
  if (error) { box.textContent = 'Không tải được tin nhắn: ' + error.message; return; }
  if (!msgs.length) { box.textContent = 'Chưa có tin nhắn nào.'; return; }

  // Đếm số tin chưa đọc để hiển thị
  const unread = msgs.filter(m => !m.is_read).length;

  box.innerHTML = `
    <p style="margin-bottom:10px">Chưa đọc: <b>${unread}</b> / ${msgs.length} tin</p>
    <table>
      <tr><th>Ngày</th><th>Họ tên</th><th>SĐT</th><th>Email</th><th>Nội dung</th><th></th></tr>
      ${msgs.map(m => `
        <tr style="${m.is_read ? '' : 'background:#f1f8e9'}">
          <td>${new Date(m.created_at).toLocaleString('vi-VN')}</td>
          <td>${esc(m.full_name)}</td>
          <td>${esc(m.phone)}</td>
          <td>${esc(m.email)}</td>
          <td style="white-space:pre-wrap">${esc(m.message)}</td>
          <td>
            ${m.is_read ? '' : `<button onclick="markMessageRead('${m.id}')">Đã đọc</button>`}
            <button class="danger" onclick="deleteMessage('${m.id}')">Xóa</button>
          </td>
        </tr>`).join('')}
    </table>`;
}

// Đánh dấu 1 tin nhắn là đã đọc rồi tải lại danh sách tin nhắn
async function markMessageRead(id) {
  await db.from('contact_messages').update({ is_read: true }).eq('id', id);
  loadContactMessages();
}

// Xóa 1 tin nhắn (có hỏi xác nhận trước) rồi tải lại danh sách tin nhắn
async function deleteMessage(id) {
  if (!confirm('Xóa tin nhắn này?')) return;
  await db.from('contact_messages').delete().eq('id', id);
  loadContactMessages();
}

// ===== TAB 4: ĐƠN HÀNG (từ giỏ hàng khách đặt) =====
async function renderOrders() {
  // Lấy đơn hàng kèm các sản phẩm trong đơn, mới nhất lên đầu
  const { data: orders } = await db.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
  const statuses = ['Mới', 'Đang giao', 'Hoàn thành', 'Đã hủy']; // các trạng thái đơn
  content.innerHTML = `
    <h2>Đơn hàng</h2>
    <table>
      <tr><th>Ngày</th><th>Khách</th><th>SĐT</th><th>Địa chỉ</th><th>Sản phẩm</th><th>Tổng</th><th>Trạng thái</th></tr>
      ${(orders || []).map(o => `
        <tr>
          <td>${new Date(o.created_at).toLocaleString('vi-VN')}</td>
          <td>${esc(o.customer_name)}</td>
          <td>${esc(o.phone)}</td>
          <td>${esc(o.address)}${o.note ? '<br><i>' + esc(o.note) + '</i>' : ''}</td>
          <td>${o.order_items.map(i => esc(i.product_name) + ' x' + i.quantity).join('<br>')}</td>
          <td>${money(o.total)}</td>
          <td>
            <select onchange="updateStatus('${o.id}', this.value)">
              ${statuses.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </td>
        </tr>`).join('')}
    </table>`;
}

// Đổi trạng thái đơn hàng khi chọn trong ô select
async function updateStatus(id, status) {
  await db.from('orders').update({ status }).eq('id', id);
}
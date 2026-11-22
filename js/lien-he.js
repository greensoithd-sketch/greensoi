// ===== 1. Kết nối Supabase =====
// Dùng cùng project với admin.js (key publishable, được phép để ở phía trình duyệt)
const SUPABASE_URL = 'https://aynmosrddjceqexblqeo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_T7sRdOKCm3ZKQJZWyGxMmg_5XB1yE59';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== 2. Hàm kiểm tra link an toàn =====
// Chỉ cho phép link bắt đầu bằng http/https để tránh link độc hại (vd: javascript:)
function safeUrl(url) {
  return /^https?:\/\//i.test(url) ? url : null;
}

// ===== 3. Hàm tạo 1 dòng thông tin liên hệ =====
// label: tên hiển thị, text: nội dung, href: link bấm được (có thể bỏ trống)
function makeItem(label, text, href) {
  const li = document.createElement('li');

  const strong = document.createElement('strong');
  strong.textContent = label + ': ';   // textContent: không chạy HTML lạ
  li.appendChild(strong);

  if (href) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';     // bảo mật khi mở tab mới
    li.appendChild(a);
  } else {
    li.appendChild(document.createTextNode(text));
  }
  return li;
}

// ===== 4. Tải thông tin liên hệ từ bảng site_content =====
// Dùng cùng các key mà tab Liên hệ trong admin đang lưu
async function loadContactInfo() {
  const list = document.getElementById('contact-list');

  // Lấy 6 mục: nội dung, hotline, địa chỉ, email, Zalo, Facebook
  const { data, error } = await db
    .from('site_content')
    .select('key, value')
    .in('key', ['contact', 'hotline', 'address', 'contact_email', 'contact_zalo', 'contact_facebook']);

  list.innerHTML = '';  // xóa chữ "Đang tải..."

  // Lỗi hoặc chưa có dữ liệu thì báo nhẹ nhàng
  if (error || !data || !data.length) {
    list.appendChild(makeItem('Thông báo', 'Chưa có thông tin liên hệ.'));
    return;
  }

  // Đổi mảng [{key, value}] thành đối tượng {key: value} cho dễ dùng
  const info = {};
  data.forEach(r => { info[r.key] = (r.value || '').trim(); });

  // Đoạn nội dung giới thiệu (từ ô "Nội dung trang Liên hệ"), đặt phía trên danh sách
  if (info.contact) {
    const intro = document.createElement('p');
    intro.style.whiteSpace = 'pre-wrap';   // giữ xuống dòng admin đã nhập
    intro.textContent = info.contact;      // textContent: không chạy HTML lạ
    list.parentNode.insertBefore(intro, list);
  }

  // Thêm từng mục nếu admin có nhập
  if (info.hotline)       list.appendChild(makeItem('Hotline', info.hotline, 'tel:' + info.hotline.replace(/\s/g, '')));
  if (info.contact_email) list.appendChild(makeItem('Email', info.contact_email, 'mailto:' + info.contact_email));
  if (info.address)       list.appendChild(makeItem('Địa chỉ', info.address));
  if (safeUrl(info.contact_zalo))     list.appendChild(makeItem('Zalo', info.contact_zalo, info.contact_zalo));
  if (safeUrl(info.contact_facebook)) list.appendChild(makeItem('Facebook', info.contact_facebook, info.contact_facebook));
}

// ===== 5. Xử lý gửi form =====
const form = document.getElementById('contact-form');
const statusEl = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');

// Hàm hiển thị thông báo (type: 'ok' hoặc 'err')
function showStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = type;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();  // chặn trình duyệt tải lại trang

  // Lấy và cắt khoảng trắng đầu/cuối
  const payload = {
    full_name: document.getElementById('full_name').value.trim(),
    phone:     document.getElementById('phone').value.trim(),
    email:     document.getElementById('email').value.trim(),
    message:   document.getElementById('message').value.trim()
  };

  // Kiểm tra: không được để trống
  if (!payload.full_name || !payload.phone || !payload.email || !payload.message) {
    return showStatus('Vui lòng điền đầy đủ các ô.', 'err');
  }
  // Kiểm tra số điện thoại: 8-15 chữ số, cho phép dấu + và khoảng trắng
  if (!/^\+?[0-9\s]{8,15}$/.test(payload.phone)) {
    return showStatus('Số điện thoại không hợp lệ.', 'err');
  }
  // Kiểm tra email cơ bản
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return showStatus('Email không hợp lệ.', 'err');
  }

  // Khóa nút để tránh bấm nhiều lần
  submitBtn.disabled = true;
  showStatus('Đang gửi...', '');

  // Lưu vào Supabase
  const { error } = await db.from('contact_messages').insert(payload);

  if (error) {
    showStatus('Gửi thất bại, vui lòng thử lại sau.', 'err');
  } else {
    showStatus('Đã gửi! Chúng tôi sẽ liên hệ với bạn sớm.', 'ok');
    form.reset();  // xóa nội dung form
  }
  submitBtn.disabled = false;
});

// ===== 6. Chạy khi trang mở =====
loadContactInfo();
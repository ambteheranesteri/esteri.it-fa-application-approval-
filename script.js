// script.js
document.addEventListener('DOMContentLoaded', () => {
  // --- عناصر صفحه ---
  const loginForm = document.getElementById('login-form');
  const searchForm = document.getElementById('search-form');
  const trackButton = document.getElementById('track-application-button');
  const loadingOverlay = document.getElementById('loading-overlay');

  const loginPage = document.getElementById('login-page');
  const searchPage = document.getElementById('search-page');
  const dashboardPage = document.getElementById('dashboard-page');
  const loginError = document.getElementById('login-error');
  const searchError = document.getElementById('search-error');
  const logoutBtn = document.getElementById('logout-btn');

  // --- تنظیمات امنیتی ---
  const SESSION_KEY = 'app_session_token';
  const SESSION_USER_KEY = 'loggedInUser';
  const SESSION_EXP_KEY = 'session_expiry';
  const SESSION_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

  // Utility: show/hide loading
  function showLoading() { loadingOverlay.classList.remove('hidden'); }
  function hideLoading() { loadingOverlay.classList.add('hidden'); }

  // جلوگیری از کش شدن صفحه در مرورگر (ایده‌آل را سرور اعمال کن)
  window.addEventListener('pageshow', (evt) => {
    // اگر صفحه از bfcache بازگشته باشد، ریفرش کن تا وضعیت سشن بررسی شود
    if (evt.persisted) {
      // refresh to force re-check
      location.reload();
    }
  });

  // تولید توکن امن (UUIDv4 ساده)
  function genToken() {
    // کریپتو برای رندوم
    const arr = new Uint8Array(16);
    window.crypto.getRandomValues(arr);
    // set version bits (4) and variant
    arr[6] = (arr[6] & 0x0f) | 0x40;
    arr[8] = (arr[8] & 0x3f) | 0x80;
    return [...arr].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // SHA-256 hashing (returns hex)
  async function sha256hex(message) {
    const enc = new TextEncoder();
    const buf = enc.encode(message);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    const arr = Array.from(new Uint8Array(hash));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // صفحه‌ها را پنهان/نمایش کن
  function showPage(pageId) {
    [loginPage, searchPage, dashboardPage].forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');

    // همیشه وقتی صفحه تغییر کرد، مقدارهای حساس در DOM پاک شود (safety)
    if (pageId === 'login-page') {
      document.getElementById('password').value = '';
    }
  }

  // چک کردن سشن: توکن و زمان انقضا
  function isSessionValid() {
    const tok = sessionStorage.getItem(SESSION_KEY);
    const expiry = sessionStorage.getItem(SESSION_EXP_KEY);
    if (!tok || !expiry) return false;
    if (Date.now() > parseInt(expiry, 10)) {
      // منقضی شده
      clearSession();
      return false;
    }
    return true;
  }

  function createSessionForUser(userObj) {
    const token = genToken();
    const expiry = Date.now() + SESSION_TIMEOUT_MS;
    sessionStorage.setItem(SESSION_KEY, token);
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(userObj));
    sessionStorage.setItem(SESSION_EXP_KEY, expiry.toString());
    // جلوگیری از بازگشت به صفحه لاگین با replace
    history.replaceState(null, '', location.href);
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(SESSION_EXP_KEY);
    // پاک کردن فرم‌ها و فیلدها
    const pw = document.getElementById('password');
    if (pw) pw.value = '';
  }

  // on load: اگر سشن معتبر بود وارد شو
  if (isSessionValid()) {
    showPage('search-page');
  } else {
    clearSession();
    showPage('login-page');
  }

  // Login handler (با هش پسورد)
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const ceuNumber = document.getElementById('ceu-number-login').value.trim();

    // بررسی اولیه ورودی‌ها
    if (!username || !password || !ceuNumber) {
      loginError.textContent = 'Please fill all required fields.';
      loginError.classList.remove('hidden');
      return;
    }

    // هش کردن پسورد واردشده
    let passHash;
    try {
      passHash = await sha256hex(password);
    } catch (err) {
      loginError.textContent = 'Crypto error.';
      loginError.classList.remove('hidden');
      return;
    }

    // userData باید از data.js لود شده باشد و شامل passwordHash باشد (SHA-256 hex)
    const match = (typeof userData !== 'undefined') ?
      userData.find(u =>
        u.username === username &&
        (u.passwordHash ? u.passwordHash === passHash : u.password === password) &&
        u.ceuNumber === ceuNumber
      ) : null;

    showLoading();
    setTimeout(() => {
      hideLoading();
      if (match) {
        // session ایجاد کن
        createSessionForUser({ username: match.username, name: match.name || '', ceuNumber: match.ceuNumber });
        showPage('search-page');
      } else {
        loginError.textContent = 'Invalid User Name, Password, or CEU Number.';
        loginError.classList.remove('hidden');
      }
    }, 800); // کمی سریع‌تر ولی قابل دیدن
  });

  // فعال/غیرفعال دکمه Track بر پایه ورودی
  searchForm.addEventListener('input', () => {
    const requiredIds = ['search-name', 'search-lastname', 'search-nationality', 'search-national-id', 'search-ceu', 'search-gender'];
    const allFilled = requiredIds.every(id => document.getElementById(id).value.trim() !== "");
    trackButton.disabled = !allFilled;
  });

  // Search submit
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    searchError.classList.add('hidden');

    if (!isSessionValid()) {
      // سشن نامعتبر یا منقضی => بازگشت لاگین
      clearSession();
      showPage('login-page');
      return;
    }

    // refresh expiry on activity (sliding session)
    const newExpiry = Date.now() + SESSION_TIMEOUT_MS;
    sessionStorage.setItem(SESSION_EXP_KEY, newExpiry.toString());

    const data = {
      name: document.getElementById('search-name').value.trim(),
      lastname: document.getElementById('search-lastname').value.trim(),
      nationality: document.getElementById('search-nationality').value.trim(),
      passportNumber: document.getElementById('search-passport').value.trim(),
      nationalIDNumber: document.getElementById('search-national-id').value.trim(),
      ceuNumber: document.getElementById('search-ceu').value.trim(),
      gender: document.getElementById('search-gender').value.trim()
    };

    const match = (typeof userData !== 'undefined') ?
      userData.find(u =>
        u.name.toLowerCase() === data.name.toLowerCase() &&
        u.lastname.toLowerCase() === data.lastname.toLowerCase() &&
        u.nationality.toLowerCase() === data.nationality.toLowerCase() &&
        u.nationalIDNumber === data.nationalIDNumber &&
        u.ceuNumber === data.ceuNumber &&
        u.gender.toLowerCase() === data.gender.toLowerCase() &&
        (data.passportNumber === "" || u.passportNumber === data.passportNumber)
      ) : null;

    showLoading();
    setTimeout(() => {
      hideLoading();
      if (match) {
        // فقط اگر کاربر لاگین بود و username‌ش با session یکی بود
        const sessionUser = sessionStorage.getItem(SESSION_USER_KEY);
        if (!sessionUser) {
          clearSession();
          showPage('login-page');
          return;
        }
        const su = JSON.parse(sessionUser);
        // match.owner یا match.username باید با su.username تطابق داشته باشد
        if (match.username === su.username) {
          showPage('dashboard-page');
          setupUserButtons(match);
        } else {
          searchError.classList.remove('hidden');
        }
      } else {
        searchError.classList.remove('hidden');
      }
    }, 800);
  });

  // تنظیم لینک دکمه‌ها
  function setupUserButtons(user) {
    const btns = {
      finalResult: document.getElementById('final-result-btn'),
      uploadPassport: document.getElementById('upload-passport-btn'),
      uploadDocuments: document.getElementById('upload-docs-btn'),
      unhcrLetter: document.getElementById('unhcr-letter-btn'),
      uploadFinger: document.getElementById('upload-finger-btn'),
    };
    Object.keys(btns).forEach(k => {
      if (user.links && user.links[k]) {
        btns[k].onclick = () => { window.location.href = user.links[k]; };
      } else {
        btns[k].onclick = () => { alert('No link provided.'); };
      }
    });
  }

  // Logout: نمایش لودینگ، پاک‌سازی سشن و جلوگیری از بازگشت Back
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      showLoading();
      // replaceState برای جلوگیری از بازگشت ساده
      history.replaceState(null, '', location.href);
      setTimeout(() => {
        clearSession();
        hideLoading();
        // استفاده از replace تا هیستوری جایگزین شود و back نتواند به داشبورد برگردد
        location.replace(location.pathname + location.search + '#loggedout');
        // بعد از replace، نمایش لاگین صفحه
        showPage('login-page');
        // کوچکترین تاخیر برای اطمینان از پاک‌سازی
        setTimeout(() => {
          // بازنویسی تاریخچه دوباره برای مطمئن شدن
          history.pushState(null, '', location.pathname + location.search);
          history.replaceState(null, '', location.pathname + location.search);
        }, 50);
      }, 900);
    });
  }

  // جلوگیری از بازگشت به صفحات محافظت‌شده توسط Back (زمانی که سشن نامعتبر است)
  window.addEventListener('popstate', () => {
    if (!isSessionValid()) {
      clearSession();
      showPage('login-page');
      // force URL replace
      location.replace(location.pathname + location.search + '#session');
    }
  });

  // پاک‌سازی فیلدها هنگام ترک صفحه
  window.addEventListener('beforeunload', () => {
    try { document.getElementById('password').value = ''; } catch (e) {}
  });

  // در هر حرکت موس یا کلید، مدت سشن را تمدید کن (sliding expiration)
  ['mousemove','keydown','click','touchstart'].forEach(evt => {
    window.addEventListener(evt, () => {
      if (isSessionValid()) {
        sessionStorage.setItem(SESSION_EXP_KEY, (Date.now() + SESSION_TIMEOUT_MS).toString());
      }
    }, { passive: true });
  });

  // اگر می‌خواهی قبل از نمایش داشبورد اطلاعات کاربر را نمایش دهی، از این تابع استفاده کن
  function getSessionUser() {
    try {
      const su = sessionStorage.getItem(SESSION_USER_KEY);
      return su ? JSON.parse(su) : null;
    } catch (e) { return null; }
  }

  // پاک‌سازی کامل در صورت تشخیص عدم اعتبار data.js یا دسترسی ناامن
  if (typeof userData === 'undefined') {
    console.warn('Warning: userData is undefined. Ensure data.js is loaded and contains password hashes (passwordHash).');
  }
});

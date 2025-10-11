document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const searchForm = document.getElementById('search-form');
  const trackButton = document.getElementById('track-application-button');
  const loadingOverlay = document.getElementById('loading-overlay');

  const loginPage = document.getElementById('login-page');
  const searchPage = document.getElementById('search-page');
  const dashboardPage = document.getElementById('dashboard-page');
  const loginError = document.getElementById('login-error');
  const searchError = document.getElementById('search-error');

  let currentUser = null;

  function showPage(pageId) {
    [loginPage, searchPage, dashboardPage].forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
  }

  function showLoading() { loadingOverlay.classList.remove('hidden'); }
  function hideLoading() { loadingOverlay.classList.add('hidden'); }

  function clearForms() {
    document.querySelectorAll('form').forEach(f => f.reset());
  }

  // جلوگیری از بازگشت با back
  history.pushState(null, null, location.href);
  window.onpopstate = () => { history.go(1); };

  // بررسی سیشن
  const savedUser = sessionStorage.getItem('loggedInUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showPage('search-page');
  } else {
    showPage('login-page');
  }

  // Login با ۳ فیلد
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    loginError.classList.add('hidden');

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const ceuNumber = document.getElementById('ceu-number-login').value.trim();

    const match = userData.find(u =>
      u.username === username &&
      u.password === password &&
      u.ceuNumber === ceuNumber
    );

    showLoading();
    setTimeout(() => {
      hideLoading();
      if (match) {
        currentUser = match;
        sessionStorage.setItem('loggedInUser', JSON.stringify(match));
        clearForms();
        showPage('search-page');
        resetInactivityTimer();
      } else {
        loginError.classList.remove('hidden');
      }
    }, 2000);
  });

  // Search form
  searchForm.addEventListener('input', () => {
    const required = ['search-name','search-lastname','search-nationality','search-national-id','search-ceu','search-gender']
      .map(id => document.getElementById(id).value.trim() !== "");
    trackButton.disabled = !required.every(Boolean);
  });

  searchForm.addEventListener('submit', e => {
    e.preventDefault();
    searchError.classList.add('hidden');

    if (!currentUser) {
      showPage('login-page');
      return;
    }

    const data = {
      name: document.getElementById('search-name').value.trim(),
      lastname: document.getElementById('search-lastname').value.trim(),
      nationality: document.getElementById('search-nationality').value.trim(),
      passportNumber: document.getElementById('search-passport').value.trim(),
      nationalIDNumber: document.getElementById('search-national-id').value.trim(),
      ceuNumber: document.getElementById('search-ceu').value.trim(),
      gender: document.getElementById('search-gender').value.trim()
    };

    const match = userData.find(u =>
      u.name.toLowerCase() === data.name.toLowerCase() &&
      u.lastname.toLowerCase() === data.lastname.toLowerCase() &&
      u.nationality.toLowerCase() === data.nationality.toLowerCase() &&
      u.nationalIDNumber === data.nationalIDNumber &&
      u.ceuNumber === data.ceuNumber &&
      u.gender.toLowerCase() === data.gender.toLowerCase() &&
      (data.passportNumber === "" || u.passportNumber === data.passportNumber)
    );

    showLoading();
    setTimeout(() => {
      hideLoading();
      if (match && match.username === currentUser.username) {
        showPage('dashboard-page');
        setupUserButtons(match);
        resetInactivityTimer();
      } else {
        searchError.classList.remove('hidden');
      }
    }, 2000);
  });

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
        btns[k].onclick = () => window.open(user.links[k], '_self');
      }
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      showLoading();
      setTimeout(() => {
        sessionStorage.removeItem('loggedInUser');
        currentUser = null;
        clearForms();
        hideLoading();
        showPage('login-page');
      }, 1000);
    });
  }

  // Auto logout پس از 2 دقیقه inactivity
  let inactivityTimer;
  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      if(currentUser) {
        alert('You have been logged out due to inactivity.');
        logoutBtn.click();
      }
    }, 120000); // 120 ثانیه
  }

  // Reset timer on any action
  ['click','mousemove','keydown','scroll'].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer);
  });

});

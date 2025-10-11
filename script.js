document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const searchForm = document.getElementById('search-form');
    const trackButton = document.getElementById('track-application-button');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Page Elements
    const loginPage = document.getElementById('login-page');
    const searchPage = document.getElementById('search-page');
    const dashboardPage = document.getElementById('dashboard-page');
    const loginError = document.getElementById('login-error');
    const searchError = document.getElementById('search-error');

    // Function to show/hide a page
    function showPage(pageId) {
        [loginPage, searchPage, dashboardPage].forEach(page => {
            page.classList.add('hidden');
        });
        document.getElementById(pageId).classList.remove('hidden');
    }

    // Function to show loading screen
    function showLoading() {
        loadingOverlay.classList.remove('hidden');
    }

    // Function to hide loading screen
    function hideLoading() {
        loadingOverlay.classList.add('hidden');
    }

    // Start on the login page
    showPage('login-page');

    let currentUser = null; // برای ذخیره کاربر فعلی

    // **Section 1: Login Logic**
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        loginError.classList.add('hidden');

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const ceuNumber = document.getElementById('ceu-number-login').value.trim();

        const match = userData.find(user =>
            user.username === username &&
            user.password === password &&
            user.ceuNumber === ceuNumber
        );

        showLoading();

        setTimeout(() => {
            hideLoading();
            if (match) {
                currentUser = match; // ذخیره کاربر واردشده
                showPage('search-page');
                searchForm.reset();
                trackButton.disabled = true;
            } else {
                loginError.classList.remove('hidden');
            }
        }, 3000);
    });

    // **Section 2: General Search Logic**

    // Enable/disable the tracking button based on required fields
    searchForm.addEventListener('input', function () {
        const requiredFields = [
            document.getElementById('search-name'),
            document.getElementById('search-lastname'),
            document.getElementById('search-nationality'),
            document.getElementById('search-national-id'),
            document.getElementById('search-ceu'),
            document.getElementById('search-gender')
        ];

        const allRequiredFilled = requiredFields.every(field => field.value.trim() !== "");
        trackButton.disabled = !allRequiredFilled;
    });

    searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        searchError.classList.add('hidden');

        const searchData = {
            name: document.getElementById('search-name').value.trim(),
            lastname: document.getElementById('search-lastname').value.trim(),
            nationality: document.getElementById('search-nationality').value.trim(),
            passportNumber: document.getElementById('search-passport').value.trim(),
            nationalIDNumber: document.getElementById('search-national-id').value.trim(),
            ceuNumber: document.getElementById('search-ceu').value.trim(),
            gender: document.getElementById('search-gender').value
        };

        const match = userData.find(user =>
            user.name.toLowerCase() === searchData.name.toLowerCase() &&
            user.lastname.toLowerCase() === searchData.lastname.toLowerCase() &&
            user.nationality.toLowerCase() === searchData.nationality.toLowerCase() &&
            user.nationalIDNumber === searchData.nationalIDNumber &&
            user.ceuNumber === searchData.ceuNumber &&
            user.gender.toLowerCase() === searchData.gender.toLowerCase() &&
            (searchData.passportNumber === "" || user.passportNumber === searchData.passportNumber)
        );

        showLoading();

        setTimeout(() => {
            hideLoading();
            if (match && currentUser && match.username === currentUser.username) {
                showPage('dashboard-page');

                // لینک‌های اختصاصی کاربر
                const links = match.links;

                if (links) {
                    // دکمه اول: Final Result
                    const finalResultButton = document.querySelector('.dashboard-button:nth-child(1)');
                    if (finalResultButton && links.finalResult) {
                        finalResultButton.onclick = () => window.open(links.finalResult, '_self');
                    }

                    // دکمه دوم: Upload Passport
                    const passportButton = document.querySelector('.dashboard-button:nth-child(2)');
                    if (passportButton && links.uploadPassport) {
                        passportButton.onclick = () => window.open(links.uploadPassport, '_self');
                    }

                    // دکمه سوم: Upload Documents
                    const docsButton = document.querySelector('.dashboard-button:nth-child(3)');
                    if (docsButton && links.uploadDocuments) {
                        docsButton.onclick = () => window.open(links.uploadDocuments, '_self');
                    }

                    // دکمه چهارم: View UNHCR REG Letter
                    const unhcrButton = document.querySelector('.dashboard-button:nth-child(4)');
                    if (unhcrButton && links.unhcrLetter) {
                        unhcrButton.onclick = () => window.open(links.unhcrLetter, '_self');
                    }

                    // دکمه پنجم: Upload Finger Prints
                    const fingerButton = document.querySelector('.dashboard-button:nth-child(5)');
                    if (fingerButton && links.uploadFinger) {
                        fingerButton.onclick = () => window.open(links.uploadFinger, '_self');
                    }
                }
            } else {
                searchError.classList.remove('hidden');
            }
        }, 3000);
    });
});

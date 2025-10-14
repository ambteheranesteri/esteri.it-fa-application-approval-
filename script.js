document.addEventListener('DOMContentLoaded', () => {

    // --- Google Sheet CSV Link ---
    // این لینک برای هر دو مرحله استفاده می شود.
    const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmwyY9o-_Uupjvr1i_f8bVWr8g87FxkZLKeDeIxAHmXlNFP4q6uhx7yCcJv9z-lZq8NZ4EYL6OgUul/pub?gid=0&single=true&output=csv';

    // --- وضعیت گلوبال ---
    let currentUser = null; // داده های کاربر پس از لاگین موفق نهایی
    let csvData = { headers: [], rows: [] }; // برای ذخیره داده های CSV
    let stepOneSuccessRow = null; // برای ذخیره ردیف تطبیق داده شده پس از مرحله ۱

    // --- DOM elements ---
    const loginForm = document.getElementById('login-form');
    const verificationForm = document.getElementById('verification-form'); // فرم جدید مرحله 2
    const logoutBtn = document.getElementById('logout-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loginPage = document.getElementById('login-page');
    const dashboardLayout = document.getElementById('dashboard-layout');
    const loginError = document.getElementById('login-error');
    const verificationError = document.getElementById('verification-error'); // پیام خطای مرحله 2
    const dashboardContent = document.querySelector('.dashboard-content');
    const contentPlaceholder = document.getElementById('content-placeholder');
    const sidebarButtons = document.querySelectorAll('.dashboard-button');
    const applicantName = document.getElementById('applicant-name');
    const applicantCaseId = document.getElementById('applicant-case-id');
    const infoIcon = document.getElementById('info-icon');
    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    // progressPercentage در HTML اصلی وجود نداشت، اگر اضافه شود، اینجا استفاده می شود.
    // const progressPercentage = document.getElementById('progress-percentage');
    const progressMessage = document.getElementById('progress-message');
    const signupMessageBox = document.getElementById('signup-message-box');
    const signupBtn = document.getElementById('signup-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');

    /**
     * اطلاعات CSV را دریافت و پردازش می کند.
     */
    async function fetchCSVData() {
        if (csvData.rows.length > 0) return true; // اگر قبلاً بارگذاری شده است، دوباره بارگذاری نکن
        try {
            const response = await fetch(sheetURL);
            const csvText = await response.text();
            const rows = csvText.split('\n').map(r => r.split(',').map(c => c.trim()));
            csvData.headers = rows.shift();
            csvData.rows = rows.filter(row => row.length === csvData.headers.length);
            return true;
        } catch (err) {
            console.error('Error fetching Google Sheet:', err);
            return false;
        }
    }

    /**
     * استانداردسازی داده برای مقایسه بدون حساسیت به حروف و فاصله
     */
    function normalize(value) {
        if (!value) return '';
        // تاریخ ها را بدون تبدیل برمی گردانیم تا مقایسه دقیق باشد
        if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return value.toString().trim();
        }
        return value.toString().trim().toUpperCase();
    }

    // === Sidebar Info Update ===
    function updateSidebarInfo() {
        if (currentUser) {
            applicantName.textContent = `${currentUser.name || 'Applicant'} ${currentUser.lastname || ''}`;
            applicantCaseId.textContent = `Case ID: ${currentUser.ceuNumber}`;
            if (currentUser.gender && currentUser.gender.toLowerCase() === 'female') {
                infoIcon.classList.remove('fa-user-circle');
                infoIcon.classList.add('fa-user-alt');
            } else {
                infoIcon.classList.add('fa-user-circle');
                infoIcon.classList.remove('fa-user-alt');
            }
        }
    }

    // === Progress Bar (منطق قبلی شما) ===
    function calculateProgress(user) {
        if (!user) return 0;
        const requiredUploads = [
            'uploadPassport',
            'uploadIdentityDocs',
            'uploadProofOfDanger',
            'uploadResidenceDocs',
            'uploadEducationJobDocs',
            'uploadFingerprints',
        ];
        const totalSteps = requiredUploads.length;
        let completedSteps = 0;
        requiredUploads.forEach(key => {
            if (user[key] && user[key].includes('http')) completedSteps++;
        });
        return Math.round((completedSteps / totalSteps) * 100);
    }

    function updateProgressUI(percentage) {
        let message = '';
        if (percentage === 0) message = "Login successful. Please start uploading your core documents.";
        else if (percentage < 25) message = "Initial documentation is required.";
        else if (percentage < 75) message = "Your file is under process.";
        else if (percentage < 100) message = "Almost done! Awaiting embassy review.";
        else message = "All documents uploaded. Your application is under final review.";

        progressContainer.classList.remove('hidden');
        progressBarFill.style.width = `${percentage}%`;
        // if (progressPercentage) progressPercentage.textContent = `${percentage}%`;
        progressMessage.textContent = message;
    }

    /**
     * === STEP 1 LOGIN: اعتبارسنجی اولیه ===
     */
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        loadingOverlay.classList.remove('hidden');
        loginError.classList.add('hidden');
        verificationError.classList.add('hidden');
        loginForm.classList.remove('hidden'); // مطمئن شویم در هنگام خطا قابل مشاهده است

        const dataFetched = await fetchCSVData();
        if (!dataFetched) {
            loadingOverlay.classList.add('hidden');
            loginError.textContent = 'Error connecting to the data source.';
            loginError.classList.remove('hidden');
            return;
        }

        const username = normalize(document.getElementById('username').value);
        const password = normalize(document.getElementById('password').value);
        const ceuNumber = normalize(document.getElementById('ceu-number-login').value);

        const usernameIndex = csvData.headers.indexOf('username');
        const passwordIndex = csvData.headers.indexOf('password');
        const ceuIndex = csvData.headers.indexOf('ceuNumber');

        stepOneSuccessRow = csvData.rows.find(row =>
            normalize(row[usernameIndex]) === username &&
            normalize(row[passwordIndex]) === password &&
            normalize(row[ceuIndex]) === ceuNumber
        );

        loadingOverlay.classList.add('hidden');

        if (stepOneSuccessRow) {
            // ✅ مرحله ۱ موفقیت آمیز: نمایش فرم مرحله ۲
            loginForm.classList.add('hidden');
            verificationForm.classList.remove('hidden');
            // پاک کردن فیلدهای مرحله ۱ برای امنیت بیشتر
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            document.getElementById('ceu-number-login').value = '';

        } else {
            // ❌ مرحله ۱ ناموفق
            loginError.classList.remove('hidden');
        }
    });

    /**
     * === STEP 2 LOGIN: اعتبارسنجی جزئیات امنیتی ===
     */
    verificationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loadingOverlay.classList.remove('hidden');
        verificationError.classList.add('hidden');
        
        // اگر ردیفی از مرحله ۱ وجود ندارد، کاربر باید دوباره شروع کند
        if (!stepOneSuccessRow) {
             loadingOverlay.classList.add('hidden');
             verificationError.textContent = 'Session expired. Please start login from Step 1.';
             verificationError.classList.remove('hidden');
             verificationForm.classList.add('hidden');
             loginForm.classList.remove('hidden');
             return;
        }

        // مقادیر مرحله ۲
        const inputName = normalize(document.getElementById('verification-name').value);
        const inputLastname = normalize(document.getElementById('verification-lastname').value);
        // تاریخ باید بدون تغییر فرمت باقی بماند تا با فرمت CSV مقایسه شود
        const inputDOB = document.getElementById('verification-dateOfBirth').value.trim(); 
        const inputNationality = normalize(document.getElementById('verification-nationality').value);
        const inputPassport = normalize(document.getElementById('verification-passportNumber').value);
        const inputNationalID = normalize(document.getElementById('verification-nationalIDNumber').value);
        const inputGender = normalize(document.getElementById('verification-gender').value);
        
        // ایندکس ستون های مرحله ۲
        const nameIndex = csvData.headers.indexOf('name');
        const lastnameIndex = csvData.headers.indexOf('lastname');
        const dobIndex = csvData.headers.indexOf('dateOfBirth');
        const nationalityIndex = csvData.headers.indexOf('nationality');
        const passportIndex = csvData.headers.indexOf('passportNumber');
        const nationalIDIndex = csvData.headers.indexOf('nationalIDNumber');
        const genderIndex = csvData.headers.indexOf('gender');
        
        // اعتبارسنجی
        const isMatch = 
            normalize(stepOneSuccessRow[nameIndex]) === inputName &&
            normalize(stepOneSuccessRow[lastnameIndex]) === inputLastname &&
            // مقایسه مستقیم تاریخ (YYYY-MM-DD)
            normalize(stepOneSuccessRow[dobIndex]) === normalize(inputDOB) && 
            normalize(stepOneSuccessRow[nationalityIndex]) === inputNationality &&
            normalize(stepOneSuccessRow[passportIndex]) === inputPassport &&
            normalize(stepOneSuccessRow[nationalIDIndex]) === inputNationalID &&
            normalize(stepOneSuccessRow[genderIndex]) === inputGender;

        loadingOverlay.classList.add('hidden');

        if (isMatch) {
            // ✅ مرحله ۲ موفقیت آمیز: ورود نهایی
            
            // پر کردن آبجکت currentUser با تمام داده های ردیف
            currentUser = {};
            csvData.headers.forEach((h, i) => currentUser[h] = stepOneSuccessRow[i]?.trim());
            
            // افزودن فیلدهای مرحله 2 برای اطمینان از صحت در currentUser
            currentUser.name = document.getElementById('verification-name').value.trim();
            currentUser.lastname = document.getElementById('verification-lastname').value.trim();
            currentUser.gender = document.getElementById('verification-gender').value.trim();


            updateSidebarInfo();
            loginPage.classList.add('hidden');
            dashboardLayout.classList.remove('hidden');
            verificationForm.classList.add('hidden');
            
            const progress = calculateProgress(currentUser);
            updateProgressUI(progress);

            // ✅ شروع تایمر و نمایش محتوای اولیه
            loadDashboardContent('application-form-btn');
            document.getElementById('application-form-btn').classList.add('active');
            startInactivityTimer();

        } else {
            // ❌ مرحله ۲ ناموفق
            verificationError.textContent = 'Error: Incorrect information. Please check all fields and try again.';
            verificationError.classList.remove('hidden');
        }
    });

    // === LOGOUT (منطق شما بدون تغییر باقی می ماند) ===
    logoutBtn.addEventListener('click', () => {
        loadingOverlay.classList.remove('hidden');
        setTimeout(() => {
            performLogout();
            loadingOverlay.classList.add('hidden');
        }, 1000);
    });

    // === SIGNUP MESSAGE TOGGLE (منطق شما بدون تغییر باقی می ماند) ===
    if (signupBtn && backToLoginBtn) {
        signupBtn.addEventListener('click', () => {
            loginForm.classList.add('hidden');
            verificationForm.classList.add('hidden'); // پنهان کردن فرم مرحله ۲
            signupMessageBox.classList.remove('hidden');
        });
        backToLoginBtn.addEventListener('click', () => {
            signupMessageBox.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }

    // === DASHBOARD BUTTON LOGIC (اصلاح شده برای استفاده از تابع به‌روزرسانی محتوا) ===
    function loadDashboardContent(buttonId) {
        if (!currentUser) return;
        const button = document.getElementById(buttonId);
        // استفاده از innerText یا textContent به جای textContent.trim()
        const title = button.textContent.replace(' ', '').trim(); 
        
        // به‌روزرسانی عنوان اصلی
        dashboardContent.querySelector('h2').textContent = title;
        
        // به‌روزرسانی محتوای Placeholder
        contentPlaceholder.innerHTML = `<p>Loading data for <strong>${title}</strong>... This section is under development.</p>`;
        
        // فعال کردن دکمه منو
        sidebarButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }

    sidebarButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (!currentUser) return;
            loadingOverlay.classList.remove('hidden');
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
                loadDashboardContent(this.id);
            }, 500);
        });
    });

    // === AUTO LOGOUT AFTER INACTIVITY (منطق شما بدون تغییر باقی می ماند) ===
    let inactivityTimer;
    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 دقیقه (بر حسب میلی‌ثانیه)

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            if (currentUser) {
                alert("You have been logged out due to inactivity.");
                performLogout();
            }
        }, INACTIVITY_LIMIT);
    }

    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
        document.addEventListener(evt, resetInactivityTimer);
    });

    function performLogout() {
        dashboardLayout.classList.add('hidden');
        loginPage.classList.remove('hidden');
        loginForm.reset();
        verificationForm.reset(); // اضافه شده برای پاک کردن فیلدهای مرحله ۲
        loginForm.classList.remove('hidden'); // نمایش فرم مرحله ۱
        verificationForm.classList.add('hidden'); // پنهان کردن فرم مرحله ۲
        
        loginError.classList.add('hidden');
        verificationError.classList.add('hidden');

        currentUser = null;
        stepOneSuccessRow = null; // پاک کردن داده های مرحله ۱
        
        progressContainer.classList.add('hidden');
        sidebarButtons.forEach(btn => btn.classList.remove('active'));
    }

    function startInactivityTimer() {
        resetInactivityTimer();
    }
});

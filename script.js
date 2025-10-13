document.addEventListener('DOMContentLoaded', () => {
    // اطلاعات کاربری فرضی بر اساس نامه شما
    const MOCK_USER = {
        username: 'SAYED_JAMSHID--',
        password: 'IT197531842----',
        ceu: '64511169-------',
        fullName: 'SAYED JAMSHID HUSSAINI',
        caseId: 'ITTEH/2025/5601612473'
    };

    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loginPage = document.getElementById('login-page');
    const dashboardLayout = document.getElementById('dashboard-layout');
    const loginError = document.getElementById('login-error');
    const dashboardContent = document.querySelector('.dashboard-content');
    const contentPlaceholder = document.getElementById('content-placeholder');
    const sidebarButtons = document.querySelectorAll('.dashboard-button');

    // === انیمیشن لاگین و مدیریت حالت ===
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const ceu = document.getElementById('ceu-number-login').value.trim();
        
        // نمایش انیمیشن لاگین (شبیه‌سازی بارگذاری)
        loadingOverlay.classList.remove('hidden');

        // شبیه‌سازی تأخیر در اتصال به سرور
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
            
            if (username === MOCK_USER.username && password === MOCK_USER.password && ceu === MOCK_USER.ceu) {
                // لاگین موفق: تغییر صفحه
                loginPage.classList.add('hidden');
                dashboardLayout.classList.remove('hidden');
                loginError.classList.add('hidden');
                
                // بارگذاری محتوای اولیه
                loadDashboardContent('application-form-btn');

            } else {
                // لاگین ناموفق
                loginError.classList.remove('hidden');
            }
        }, 2000); // تأخیر ۲ ثانیه‌ای برای انیمیشن ورود
    });

    // === مدیریت خروج ===
    logoutBtn.addEventListener('click', function() {
        // نمایش انیمیشن خروج
        loadingOverlay.classList.remove('hidden');

        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
            
            // بازگشت به صفحه لاگین
            dashboardLayout.classList.add('hidden');
            loginPage.classList.remove('hidden');

            // ریست کردن فرم لاگین
            loginForm.reset();
        }, 1000); // تأخیر ۱ ثانیه‌ای برای انیمیشن خروج
    });

    // === مدیریت سایدبار و بارگذاری محتوا ===
    
    // تابع بارگذاری محتوای داینامیک
    function loadDashboardContent(buttonId) {
        const button = document.getElementById(buttonId);
        const title = button.textContent.trim();
        
        // تنظیم عنوان بخش محتوا
        dashboardContent.querySelector('h2').textContent = title;

        // شبیه‌سازی محتوای هر بخش
        let contentHTML = '';

        switch(buttonId) {
            case 'application-form-btn':
                contentHTML = `
                    <div class="alert-box primary"><i class="fas fa-info-circle"></i><p>Please review and verify your Type D Visa Application Form details below. Any required corrections must be submitted immediately.</p></div>
                    <p class="content-detail">Form Status: **Completed & Ready**</p>
                    <p class="content-detail">Review Date: 2025-09-01</p>
                    <button class="official-button" style="width: auto;"><i class="fas fa-eye"></i> View/Print Form</button>
                `;
                break;
            case 'appointment-details-btn':
                contentHTML = `
                    <div class="alert-box success"><i class="fas fa-calendar-check"></i><p>Your interview is **Confirmed** by the Embassy of Italy in Tehran. Please ensure punctual attendance.</p></div>
                    <p class="content-detail">Date: **20 October 2025**</p>
                    <p class="content-detail">Time: 10:30 AM</p>
                    <p class="content-detail">Location: Embassy of Italy - Tehran</p>
                    <button class="official-button" style="width: auto;"><i class="fas fa-print"></i> Print Confirmation Letter</button>
                `;
                break;
            case 'payment-confirm-btn':
                contentHTML = `
                    <div class="alert-box primary"><i class="fas fa-euro-sign"></i><p>The **EUR 230** processing fee is mandatory. Upload your international bank receipt below.</p></div>
                    <form><label for="payment-upload">Upload Receipt (PDF/JPG):</label><input type="file" id="payment-upload" required><button type="submit" class="official-button" style="width: auto; margin-left: 10px;">Upload</button></form>
                    <p class="content-detail" style="margin-top: 15px;">Payment Status: **Awaiting Receipt Upload**</p>
                `;
                break;
            case 'final-result-btn':
                contentHTML = `
                    <div class="alert-box danger"><i class="fas fa-times-circle"></i><p>The final decision on your humanitarian visa application is **PENDING REVIEW** by the Consular Section. Check back regularly.</p></div>
                    <p class="content-detail">Estimated Completion: Varies (Min. 30 days post-interview)</p>
                `;
                break;
            default:
                contentHTML = `
                    <div class="alert-box primary"><i class="fas fa-file-upload"></i><p>This is the upload area for **${title}**. Please use high-resolution PDF files only.</p></div>
                    <form><label for="doc-upload">Select File:</label><input type="file" id="doc-upload" required><button type="submit" class="official-button" style="width: auto; margin-left: 10px;">Submit Document</button></form>
                `;
                break;
        }

        // جایگذاری محتوای جدید
        contentPlaceholder.innerHTML = contentHTML;
    }

    // اضافه کردن شنونده رویداد به دکمه‌های سایدبار
    sidebarButtons.forEach(button => {
        button.addEventListener('click', function() {
            // انیمیشن شبیه‌سازی بارگذاری محتوا
            loadingOverlay.classList.remove('hidden');
            
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
                
                // مدیریت کلاس active (انتخاب دکمه)
                sidebarButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // بارگذاری محتوا
                loadDashboardContent(this.id);

            }, 500); // تأخیر ۰.۵ ثانیه‌ای برای انیمیشن بارگذاری محتوا
        });
    });
});

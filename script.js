document.addEventListener('DOMContentLoaded', () => {

    // --- داده‌های کاربری ---
    const userData = [
        {
            username: "BIBI SAYEDA",
            password: "IT457219308",
            ceuNumber: "ITA/IRN/2025/457219308",
            name: "BIBI SAYEDA",
            lastname: "HUSSAIN KHAIL",
            nationality: "AFGHAN",
            passportNumber: "0700-04573",
            nationalIDNumber: "0700-04573",
            gender: "Female",
            links: {
                finalResult: "https://ambteheranesteri.github.io/approval-result-view/ITAIRN2025457219308.pdf",
                uploadPassport: "https://example.com/mashal-passport",
                uploadDocuments: "https://example.com/mashal-docs",
                AppointmentResult: "https://ambteheranesteri.github.io/approval-result-view/ITAIRN2025457219308.pdf",
                unhcrLetter: "https://example.com/mashal-unhcr",
                uploadFinger: "https://example.com/mashal-finger"
            }
        },
        {
            username: "ABDUL GHAFOOR",
            password: "IT659349731",
            ceuNumber: "ITA/IRN/2025/659349731",
            name: "ABDUL GHAFOOR",
            lastname: "HAKIMI",
            nationality: "AFGHAN",
            passportNumber: "P00766839",
            nationalIDNumber: "0600-20650",
            gender: "male",
            links: {
                finalResult: "https://ambteheranesteri.github.io/approval-result-view/ITAIRN2025659349731.pdf",
                uploadPassport: "https://example.com/mashal2-passport",
                uploadDocuments: "https://example.com/mashal2-docs",
                AppointmentResult: "https://ambteheranesteri.github.io/approval-result-view/ITAIRN2025659349731.pdf",
                unhcrLetter: "https://example.com/mashal2-unhcr",
                uploadFinger: "https://example.com/mashal2-finger"
            }
        },
        {
            username: "SAYED JAMSHID",
            password: "IT197531842",
            ceuNumber: "64511169",
            name: "SAYED JAMSHID",
            lastname: "HUSSAINI",
            nationality: "AFGHAN",
            passportNumber: "P01550807",
            nationalIDNumber: "1400-0101-12696",
            gender: "male",
            links: {
                finalResult: "https://ambteheranesteri.github.io/approval-result-view/ITTEH-2025-5601612473-appointment.pdf",
                uploadPassport: "https://example.com/mashal2-passport",
                uploadDocuments: "https://example.com/mashal2-docs",
                AppointmentResult: "https://ambteheranesteri.github.io/approval-result-view/ITTEH-2025-5601612473-appointment.pdf",
                unhcrLetter: "https://example.com/mashal2-unhcr",
                uploadFinger: "https://example.com/mashal2-finger"
            }
        },
        {
            username: "MASHAL SAIDY",
            password: "IT761319690",
            ceuNumber: "ITA/IRN/2025/761319690",
            name: "MASHAL",
            lastname: "SAIDY",
            nationality: "AFGHAN",
            passportNumber: "30811641",
            nationalIDNumber: "30811641",
            gender: "Female",
            links: {
                finalResult: "https://ambteheranesteri.github.io/approval-result-view/ITAIRN2025761319690.pdf",
                uploadPassport: "https://example.com/farah-passport",
                uploadDocuments: "https://example.com/farah-docs",
                AppointmentResult: "https://ambteheranesteri.github.io/approval-result-view/ITAIRN2025761319690.pdf",
                unhcrLetter: "https://example.com/farah-unhcr",
                uploadFinger: "https://example.com/farah-finger"
            }
        }
    ];
    
    // --- متغیر سراسری برای نگهداری اطلاعات کاربر فعلی ---
    let currentUser = null; 

    // --- تعریف متغیرهای DOM اصلی ---
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loginPage = document.getElementById('login-page');
    const dashboardLayout = document.getElementById('dashboard-layout');
    const loginError = document.getElementById('login-error');
    const dashboardContent = document.querySelector('.dashboard-content');
    const contentPlaceholder = document.getElementById('content-placeholder');
    const sidebarButtons = document.querySelectorAll('.dashboard-button');
    const applicantName = document.getElementById('applicant-name');
    const applicantCaseId = document.getElementById('applicant-case-id');
    const infoIcon = document.getElementById('info-icon');
    
    // --- متغیرهای جدید DOM برای نوار پیشرفت (از فوتر) ---
    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressMessage = document.getElementById('progress-message');


    // === تابع به‌روزرسانی اطلاعات سایدبار ===
    function updateSidebarInfo() {
        if (currentUser) {
            applicantName.textContent = `${currentUser.name} ${currentUser.lastname}`;
            applicantCaseId.textContent = `Case ID: ${currentUser.ceuNumber}`;
            // تغییر آیکون بر اساس جنسیت (اختیاری)
            if (currentUser.gender && currentUser.gender.toLowerCase() === 'female') {
                infoIcon.classList.remove('fa-user-circle');
                infoIcon.classList.add('fa-user-alt');
            } else {
                infoIcon.classList.add('fa-user-circle');
                infoIcon.classList.remove('fa-user-alt');
            }
        }
    }
    
    // ------------------------------------------------------------------
    // === منطق جدید: محاسبه درصد تکمیل مدارک برای نوار پیشرفت ===
    // ------------------------------------------------------------------
    function calculateProgress(user) {
        if (!user || !user.links) return 0;

        // دکمه‌هایی که معادل آپلود یک مدرک مهم هستند
        const requiredUploads = [
            'uploadPassport', 
            'uploadDocuments', // اسناد هویتی
            'unhcrLetter', 
            'uploadFinger',
            'AppointmentResult', // اگر لینک نتیجه نوبت‌دهی موجود باشد، یک مرحله مهم طی شده است.
            // توجه: uploadPhoto، uploadIdentity، uploadDanger، uploadResidence و finalResult نیز می‌توانند به این لیست اضافه شوند.
        ];
        
        const totalSteps = requiredUploads.length;
        let completedSteps = 0;

        requiredUploads.forEach(key => {
            // فرض: اگر لینک مربوط به مدرک وجود داشته باشد و مقدار آن یک URL معتبر باشد (شامل http باشد)، یعنی آپلود شده/موجود است.
            if (user.links[key] && user.links[key].includes('http')) {
                completedSteps++;
            }
        });

        const percentage = Math.round((completedSteps / totalSteps) * 100);
        return percentage;
    }

    // === منطق جدید: تابع به‌روزرسانی نوار پیشرفت ===
    function updateProgressUI(percentage) {
        let message = '';
        
        // تنظیم پیام‌های رسمی بر اساس درصد
        if (percentage === 0) {
            message = "Login successful. Please start uploading your core documents immediately.";
        } else if (percentage < 25) {
            message = "Initial documentation is required. Please upload your core documents.";
        } else if (percentage < 75) {
            message = "Your file is being processed. Complete all missing uploads to expedite review.";
        } else if (percentage < 100) {
            message = "Documentation phase nearing completion. Your case is preparing for consular review.";
        } else {
            message = "All documents uploaded. Your application is fully prepared and under legal review by the Embassy.";
        }
        
        // به‌روزرسانی نوار
        progressContainer.classList.remove('hidden');
        progressBarFill.style.width = `${percentage}%`;
        progressPercentage.textContent = `${percentage}%`;
        progressMessage.textContent = message;
    }
    // ------------------------------------------------------------------
    // ------------------------------------------------------------------


    // === مدیریت لاگین (به‌روزرسانی شده برای نوار پیشرفت) ===
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const usernameInput = document.getElementById('username').value.trim().toUpperCase();
        const passwordInput = document.getElementById('password').value.trim();
        const ceuInput = document.getElementById('ceu-number-login').value.trim();
        
        // نمایش انیمیشن لاگین
        loadingOverlay.classList.remove('hidden');

        // شبیه‌سازی تأخیر در اتصال به سرور
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
            
            // جستجوی کاربر در آرایه
            currentUser = userData.find(user => 
                user.username.toUpperCase() === usernameInput && 
                user.password === passwordInput && 
                user.ceuNumber === ceuInput
            );

            if (currentUser) {
                // لاگین موفق:
                updateSidebarInfo(); 

                loginPage.classList.add('hidden');
                dashboardLayout.classList.remove('hidden');
                loginError.classList.add('hidden');
                
                // --- به‌روزرسانی نوار پیشرفت پس از ورود ---
                const progress = calculateProgress(currentUser);
                updateProgressUI(progress);
                
                // بارگذاری محتوای اولیه
                loadDashboardContent('application-form-btn');

            } else {
                // لاگین ناموفق
                loginError.classList.remove('hidden');
                progressContainer.classList.add('hidden'); // مخفی کردن نوار پیشرفت در صورت خطا
                currentUser = null; 
            }
        }, 2000); 
    });

    // === مدیریت خروج (به‌روزرسانی شده برای نوار پیشرفت) ===
    logoutBtn.addEventListener('click', function() {
        loadingOverlay.classList.remove('hidden');

        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
            
            dashboardLayout.classList.add('hidden');
            loginPage.classList.remove('hidden');

            loginForm.reset();
            currentUser = null; 
            
            // --- مخفی کردن نوار پیشرفت پس از خروج ---
            progressContainer.classList.add('hidden');
        }, 1000); 
    });

    // === تابع بارگذاری محتوای داینامیک ===
    function loadDashboardContent(buttonId) {
        if (!currentUser) return;

        const button = document.getElementById(buttonId);
        const title = button.textContent.trim();
        
        dashboardContent.querySelector('h2').textContent = title;

        let contentHTML = '';

        // منطق برای دکمه‌هایی که نیاز به لینک‌های اختصاصی کاربر دارند
        switch(buttonId) {
            case 'application-form-btn':
                contentHTML = `
                    <div class="alert-box primary"><i class="fas fa-info-circle"></i><p>Please review and verify your Type D Visa Application Form details below. Any required corrections must be submitted immediately.</p></div>
                    <p class="content-detail">Form Status: **Completed & Ready**</p>
                    <p class="content-detail">Applicant Name: ${currentUser.name} ${currentUser.lastname}</p>
                    <button class="official-button" style="width: auto;"><i class="fas fa-eye"></i> View/Print Form</button>
                `;
                break;
            
            case 'appointment-details-btn':
                const appointmentLink = currentUser.links.AppointmentResult || '#';
                contentHTML = `
                    <div class="alert-box success"><i class="fas fa-calendar-check"></i><p>Your interview is **Confirmed** by the Embassy of Italy in Tehran. Please ensure punctual attendance.</p></div>
                    <p class="content-detail">Date: **20 October 2025** (Mock Date)</p>
                    <p class="content-detail">Location: Embassy of Italy - Tehran</p>
                    <a href="${appointmentLink}" target="_blank" class="official-button" style="width: auto;"><i class="fas fa-print"></i> Print Confirmation Letter</a>
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
                const resultLink = currentUser.links.finalResult || '#';
                contentHTML = `
                    <div class="alert-box danger"><i class="fas fa-times-circle"></i><p>The final decision on your humanitarian visa application is **PENDING REVIEW** by the Consular Section. Check back regularly.</p></div>
                    <p class="content-detail">Estimated Completion: Varies (Min. 30 days post-interview)</p>
                    <a href="${resultLink}" target="_blank" class="official-button" style="width: auto;"><i class="fas fa-gavel"></i> View Latest Decision Letter</a>
                `;
                break;

            case 'unhcr-letter-btn':
                const unhcrLink = currentUser.links.unhcrLetter || '#';
                contentHTML = `
                    <div class="alert-box primary"><i class="fas fa-hands-helping"></i><p>View or Re-upload your UNHCR Registration document.</p></div>
                    <a href="${unhcrLink}" target="_blank" class="official-button" style="width: auto;"><i class="fas fa-eye"></i> View Current UNHCR Document</a>
                    <form style="margin-top: 20px;"><label for="unhcr-upload">Re-upload File:</label><input type="file" id="unhcr-upload" required><button type="submit" class="official-button" style="width: auto; margin-left: 10px;">Re-upload</button></form>
                `;
                break;

            // منطق پیش‌فرض برای دکمه‌های آپلود
            case 'upload-passport-btn':
            case 'upload-finger-btn':
            case 'upload-danger-btn':
            case 'upload-residence-btn':
            case 'upload-education-btn':
            case 'upload-identity-btn':
            case 'upload-photo-btn': // اضافه کردن دکمه عکس
            case 'upload-documents-btn': // نام گذاری دیگر برای آپلود اسناد هویتی
            default:
                contentHTML = `
                    <div class="alert-box primary"><i class="fas fa-file-upload"></i><p>This is the upload area for **${title}**. Please use high-resolution PDF files only.</p></div>
                    <form><label for="doc-upload">Select File:</label><input type="file" id="doc-upload" required><button type="submit" class="official-button" style="width: auto; margin-left: 10px;">Submit Document</button></form>
                    <p class="content-detail" style="margin-top: 15px;">Note: Any new upload will replace the previous one.</p>
                `;
                break;
        }

        contentPlaceholder.innerHTML = contentHTML;
    }

    // اضافه کردن شنونده رویداد به دکمه‌های سایدبار
    sidebarButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (!currentUser) return;

            loadingOverlay.classList.remove('hidden');
            
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
                
                sidebarButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                loadDashboardContent(this.id);

            }, 500); 
        });
    });
});

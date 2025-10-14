document.addEventListener('DOMContentLoaded', () => {

    // --- Google Sheet CSV Link ---
    const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmwyY9o-_Uupjvr1i_f8bVWr8g87FxkZLKeDeIxAHmXlNFP4q6uhx7yCcJv9z-lZq8NZ4EYL6OgUul/pub?gid=0&single=true&output=csv';

    let currentUser = null;

    // --- DOM elements ---
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
    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressMessage = document.getElementById('progress-message');
    const signupMessageBox = document.getElementById('signup-message-box');
    const signupBtn = document.getElementById('signup-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');

    // === Sidebar Info Update ===
    function updateSidebarInfo() {
        if (currentUser) {
            applicantName.textContent = `${currentUser.name} ${currentUser.lastname}`;
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

    // === Progress Bar ===
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
        progressPercentage.textContent = `${percentage}%`;
        progressMessage.textContent = message;
    }

    // === LOGIN ===
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim().toUpperCase();
        const password = document.getElementById('password').value.trim();
        const ceuNumber = document.getElementById('ceu-number-login').value.trim();

        loadingOverlay.classList.remove('hidden');
        loginError.classList.add('hidden');

        try {
            const response = await fetch(sheetURL);
            const csvText = await response.text();
            const rows = csvText.split('\n').map(r => r.split(','));
            const headers = rows.shift().map(h => h.trim());

            const usernameIndex = headers.indexOf('username');
            const passwordIndex = headers.indexOf('password');
            const ceuIndex = headers.indexOf('ceuNumber');

            const matchedRow = rows.find(row =>
                row[usernameIndex]?.trim().toUpperCase() === username &&
                row[passwordIndex]?.trim() === password &&
                row[ceuIndex]?.trim() === ceuNumber
            );

            if (matchedRow) {
                currentUser = {};
                headers.forEach((h, i) => currentUser[h] = matchedRow[i]?.trim());

                updateSidebarInfo();
                loginPage.classList.add('hidden');
                dashboardLayout.classList.remove('hidden');

                const progress = calculateProgress(currentUser);
                updateProgressUI(progress);

                // ✅ نکته مهم: شروع تایمر بعد از لاگین موفق
                startInactivityTimer();

            } else {
                loginError.classList.remove('hidden');
            }
        } catch (err) {
            console.error('Error fetching Google Sheet:', err);
            loginError.textContent = 'Error connecting to server.';
            loginError.classList.remove('hidden');
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    });

    // === LOGOUT ===
    logoutBtn.addEventListener('click', () => {
        loadingOverlay.classList.remove('hidden');
        setTimeout(() => {
            loadingOverlay.classList.add('hidden');
            dashboardLayout.classList.add('hidden');
            loginPage.classList.remove('hidden');
            loginForm.reset();
            loginError.classList.add('hidden');
            currentUser = null;
            progressContainer.classList.add('hidden');
            sidebarButtons.forEach(btn => btn.classList.remove('active'));
        }, 1000);
    });

    // === SIGNUP MESSAGE TOGGLE ===
    if (signupBtn && backToLoginBtn) {
        signupBtn.addEventListener('click', () => {
            loginForm.classList.add('hidden');
            signupMessageBox.classList.remove('hidden');
        });
        backToLoginBtn.addEventListener('click', () => {
            signupMessageBox.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }

    // === DASHBOARD BUTTON LOGIC ===
    function loadDashboardContent(buttonId) {
        if (!currentUser) return;
        const button = document.getElementById(buttonId);
        const title = button.textContent.trim();
        dashboardContent.querySelector('h2').textContent = title;
        contentPlaceholder.innerHTML = `<p>Loading data for <strong>${title}</strong>...</p>`;
    }

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

    // === AUTO LOGOUT AFTER INACTIVITY ===
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
        loginError.classList.add('hidden');
        currentUser = null;
        progressContainer.classList.add('hidden');
        sidebarButtons.forEach(btn => btn.classList.remove('active'));
    }

    function startInactivityTimer() {
        resetInactivityTimer();
    }
});

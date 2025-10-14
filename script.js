document.addEventListener('DOMContentLoaded', () => {

    const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmwyY9o-_Uupjvr1i_f8bVWr8g87FxkZLKeDeIxAHmXlNFP4q6uhx7yCcJv9z-lZq8NZ4EYL6OgUul/pub?gid=0&single=true&output=csv';

    let currentUser = null;
    let step1User = null;

    // --- DOM elements ---
    const loginForm = document.getElementById('login-form');
    const loginStep2 = document.getElementById('login-step2');
    const step2Error = document.getElementById('step2-error');
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

    // === LOGIN STEP 1 ===
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
                step1User = {};
                headers.forEach((h, i) => step1User[h] = matchedRow[i]?.trim());

                // مرحله اول درست → فرم دوم باز شود
                loginForm.classList.add('hidden');
                loginStep2.classList.remove('hidden');
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

    // === LOGIN STEP 2 ===
    loginStep2.addEventListener('submit', (e) => {
        e.preventDefault();
        step2Error.classList.add('hidden');

        const fields = ['name', 'lastname', 'dob', 'nationality', 'passportNumber', 'nationalIDNumber', 'gender'];

        let allMatch = true;
        for (let f of fields) {
            const userValue = document.getElementById(f).value.trim().toUpperCase();
            const sheetValue = (step1User[f === 'dob' ? 'Date of birth' : f]?.trim() || '').toUpperCase();
            if (userValue !== sheetValue) {
                allMatch = false;
                break;
            }
        }

        if (!allMatch) {
            step2Error.classList.remove('hidden');
            return;
        }

        // همه فیلدها درست بود → ورود به داشبورد
        currentUser = step1User;
        loginStep2.classList.add('hidden');
        dashboardLayout.classList.remove('hidden');
        updateSidebarInfo();

        const progress = calculateProgress(currentUser);
        updateProgressUI(progress);
        startInactivityTimer();
    });

    // === AUTO LOGOUT AFTER INACTIVITY ===
    let inactivityTimer;
    const INACTIVITY_LIMIT = 5 * 60 * 1000;

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
        loginForm.classList.remove('hidden');
        loginStep2.classList.add('hidden');
        loginForm.reset();
        loginStep2.reset();
        loginError.classList.add('hidden');
        step2Error.classList.add('hidden');
        currentUser = null;
        step1User = null;
        progressContainer.classList.add('hidden');
        sidebarButtons.forEach(btn => btn.classList.remove('active'));
    }

    function startInactivityTimer() {
        resetInactivityTimer();
    }

    logoutBtn.addEventListener('click', performLogout);
});

document.addEventListener('DOMContentLoaded', () => {

    // --- Google Sheet CSV Link ---
    const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmwyY9o-_Uupjvr1i_f8bVWr8g87FxkZLKeDeIxAHmXlNFP4q6uhx7yCcJv9z-lZq8NZ4EYL6OgUul/pub?gid=0&single=true&output=csv';

    // --- Global State ---
    let currentUser = null;
    let csvData = { headers: [], rows: [] };

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
    const progressMessage = document.getElementById('progress-message');
    const signupMessageBox = document.getElementById('signup-message-box');
    const signupBtn = document.getElementById('signup-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');

    // --- Expected headers in Google Sheet ---
    const expectedHeaders = {
        'username': 'username',
        'password': 'password',
        'ceuNumber': 'ceuNumber',
        'name': 'name',
        'lastname': 'lastname',
        'gender': 'gender',
    };

    // --- Helpers ---
    function findHeaderIndex(targetHeader) {
        const normalizedTarget = targetHeader.trim().toLowerCase().replace(/\s/g, '');
        for (let i = 0; i < csvData.headers.length; i++) {
            const normalizedSheetHeader = csvData.headers[i].trim().toLowerCase().replace(/\s/g, '');
            if (normalizedSheetHeader === normalizedTarget) return i;
        }
        return -1;
    }

    async function fetchCSVData() {
        if (csvData.rows.length > 0) return true;
        try {
            const response = await fetch(sheetURL);
            if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
            const csvText = await response.text();
            const rows = csvText.split('\n').map(r => r.split(',').map(c => c.trim().replace(/"/g, '')));
            csvData.headers = rows.shift().map(h => h.trim());
            csvData.rows = rows.filter(r => r.length === csvData.headers.length && r.some(c => c !== ''));
            return true;
        } catch (err) {
            console.error(err);
            loginError.textContent = 'Error connecting to data source.';
            loginError.classList.remove('hidden');
            return false;
        }
    }

    function normalize(v) {
        if (!v) return '';
        const val = v.toString().trim();
        return val.toUpperCase();
    }

    function updateSidebarInfo() {
        if (!currentUser) return;
        applicantName.textContent = `${currentUser.name || ''} ${currentUser.lastname || ''}`;
        applicantCaseId.textContent = `Case ID: ${currentUser.ceuNumber || ''}`;
        if (currentUser.gender?.toLowerCase() === 'female') {
            infoIcon.classList.replace('fa-user-circle', 'fa-user-alt');
        } else {
            infoIcon.classList.replace('fa-user-alt', 'fa-user-circle');
        }
    }

    function calculateProgress(user) {
        if (!user) return 0;
        const keys = ['uploadPassport', 'uploadIdentityDocs', 'uploadProofOfDanger', 'uploadResidenceDocs', 'uploadEducationJobDocs', 'uploadFingerprints'];
        const done = keys.filter(k => user[k] && user[k].includes('http')).length;
        return Math.round((done / keys.length) * 100);
    }

    function updateProgressUI(p) {
        let msg = '';
        if (p === 0) msg = "Login successful. Please start uploading documents.";
        else if (p < 25) msg = "Initial documentation required.";
        else if (p < 75) msg = "Your file is under process.";
        else if (p < 100) msg = "Almost done! Awaiting review.";
        else msg = "All documents uploaded.";
        progressContainer.classList.remove('hidden');
        progressBarFill.style.width = `${p}%`;
        progressMessage.textContent = msg;
    }

    // === LOGIN ===
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loadingOverlay.classList.remove('hidden');
        loginError.classList.add('hidden');

        const dataFetched = await fetchCSVData();
        if (!dataFetched) {
            loadingOverlay.classList.add('hidden');
            return;
        }

        const uIndex = findHeaderIndex(expectedHeaders.username);
        const pIndex = findHeaderIndex(expectedHeaders.password);
        const cIndex = findHeaderIndex(expectedHeaders.ceuNumber);

        if (uIndex === -1 || pIndex === -1 || cIndex === -1) {
            loginError.textContent = 'Sheet header mismatch.';
            loginError.classList.remove('hidden');
            loadingOverlay.classList.add('hidden');
            return;
        }

        const username = normalize(document.getElementById('username').value);
        const password = normalize(document.getElementById('password').value);
        const ceu = normalize(document.getElementById('ceu-number-login').value);

        const row = csvData.rows.find(r =>
            normalize(r[uIndex]) === username &&
            normalize(r[pIndex]) === password &&
            normalize(r[cIndex]) === ceu
        );

        loadingOverlay.classList.add('hidden');

        if (!row) {
            loginError.classList.remove('hidden');
            return;
        }

        currentUser = {};
        csvData.headers.forEach((h, i) => currentUser[h.toLowerCase().replace(/\s/g, '')] = row[i]?.trim());
        currentUser.name = row[findHeaderIndex(expectedHeaders.name)]?.trim();
        currentUser.lastname = row[findHeaderIndex(expectedHeaders.lastname)]?.trim();
        currentUser.gender = row[findHeaderIndex(expectedHeaders.gender)]?.trim();

        updateSidebarInfo();
        loginPage.classList.add('hidden');
        dashboardLayout.classList.remove('hidden');

        updateProgressUI(calculateProgress(currentUser));

        loadDashboardContent('application-form-btn');
        document.getElementById('application-form-btn').classList.add('active');
        startInactivityTimer();
    });

    // === LOGOUT ===
    logoutBtn.addEventListener('click', () => {
        loadingOverlay.classList.remove('hidden');
        setTimeout(() => {
            performLogout();
            loadingOverlay.classList.add('hidden');
        }, 800);
    });

    // === SIGNUP TOGGLE ===
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

    // === DASHBOARD ===
    function loadDashboardContent(buttonId) {
        if (!currentUser) return;
        const button = document.getElementById(buttonId);
        if (!button) return;

        const title = button.textContent.trim();
        dashboardContent.querySelector('h2').textContent = title;
        let html = '';

        const uploadSection = (id, label) => `
            <h3>${label}</h3>
            <input type="file" id="${id}-file" multiple accept=".pdf,.jpg,.png,.jpeg" /><br><br>
            <button type="button" class="official-button" id="upload-${id}">Upload</button>
            <p id="${id}-status" style="margin-top:10px;"></p>
        `;

        switch (buttonId) {
            case 'application-form-btn':
                html = `
                    <h3>Application Form</h3>
                    <form id="application-form">
                        <label>First Name:</label><br>
                        <input type="text" value="${currentUser.name || ''}" /><br><br>
                        <label>Last Name:</label><br>
                        <input type="text" value="${currentUser.lastname || ''}" /><br><br>
                        <label>CEU Number:</label><br>
                        <input type="text" value="${currentUser.ceuNumber || ''}" readonly /><br><br>
                        <button type="button" class="official-button" id="save-application-btn">Save</button>
                    </form>
                    <p id="app-form-status" style="margin-top:10px;"></p>
                `;
                break;
            case 'upload-passport-btn': html = uploadSection('passport', 'Upload Passport'); break;
            case 'upload-photo-btn': html = uploadSection('photo', 'Upload Photo'); break;
            case 'upload-identity-btn': html = uploadSection('identity', 'Upload Identity Documents'); break;
            case 'unhcr-letter-btn':
                html = `
                    <h3>UNHCR Registration Letter</h3>
                    <p>View your UNHCR registration details.</p>
                    <button id="view-unhcr" class="official-button">View Info</button>
                    <div id="unhcr-details" style="margin-top:10px;"></div>
                `;
                break;
            case 'upload-danger-btn': html = uploadSection('danger', 'Upload Proof of Danger'); break;
            case 'upload-residence-btn': html = uploadSection('residence', 'Upload Residence Docs'); break;
            case 'upload-education-btn': html = uploadSection('education', 'Upload Educational/Job Docs'); break;
            case 'appointment-details-btn':
                html = `
                    <h3>Appointment Details</h3>
                    <p>No appointment scheduled yet.</p>
                    <button id="book-appointment" class="official-button">Book Appointment</button>
                `;
                break;
            case 'payment-confirm-btn': html = uploadSection('payment', 'Payment Confirmation'); break;
            case 'upload-finger-btn': html = uploadSection('finger', 'Upload Fingerprints'); break;
            case 'track-status-btn':
                html = `
                    <h3>Track Application Status</h3>
                    <div id="status-box" style="border:1px solid #ccc; padding:10px;">
                        <strong>Under Review</strong><br>Expected completion: 7 working days.
                    </div>`;
                break;
            case 'final-checklist-btn':
                html = `
                    <h3>Final Review Checklist</h3>
                    <ul>
                        <li>✅ Passport Uploaded</li>
                        <li>✅ ID Documents Submitted</li>
                        <li>🕒 Awaiting Embassy Decision</li>
                    </ul>`;
                break;
            case 'interview-guide-btn':
                html = `
                    <h3>Interview Guide & FAQs</h3>
                    <ul>
                        <li>Bring all originals.</li>
                        <li>Arrive 15 min early.</li>
                        <li>No phones inside embassy.</li>
                    </ul>`;
                break;
            case 'final-result-btn':
                html = `<h3>Final Result</h3><p>Status: Under Embassy Review.</p>`;
                break;
            case 'download-visa-btn':
                html = `
                    <h3>Download Visa Letter</h3>
                    <button id="download-visa" class="official-button">Download Visa Letter</button>
                    <p id="download-status" style="margin-top:10px;"></p>
                `;
                break;
            default:
                html = `<p>Loading data for <strong>${title}</strong>... This section is under development.</p>`;
        }

        contentPlaceholder.innerHTML = html;
        sidebarButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Simple upload simulation
        const uploadBtns = document.querySelectorAll('[id^="upload-"]');
        uploadBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.id.replace('upload-', '');
                const fileInput = document.getElementById(`${id}-file`);
                const status = document.getElementById(`${id}-status`);
                if (!fileInput || fileInput.files.length === 0) {
                    status.textContent = 'Please select a file first.';
                } else {
                    status.textContent = 'Uploading... (demo)';
                    setTimeout(() => { status.textContent = 'Upload complete (demo).'; }, 800);
                }
            });
        });

        const saveBtn = document.getElementById('save-application-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => {
            document.getElementById('app-form-status').textContent = 'Form saved (demo).';
        });

        const viewUnhcrBtn = document.getElementById('view-unhcr');
        if (viewUnhcrBtn)
            viewUnhcrBtn.addEventListener('click', () => {
                document.getElementById('unhcr-details').innerHTML = `
                    <strong>Name:</strong> ${currentUser.name || ''} ${currentUser.lastname || ''}<br>
                    <strong>CEU:</strong> ${currentUser.ceuNumber}<br>
                    <strong>Status:</strong> Verified (demo)
                `;
            });

        const bookBtn = document.getElementById('book-appointment');
        if (bookBtn) bookBtn.addEventListener('click', () => alert('Appointment booking simulated (demo).'));

        const downloadVisaBtn = document.getElementById('download-visa');
        if (downloadVisaBtn)
            downloadVisaBtn.addEventListener('click', () => {
                document.getElementById('download-status').textContent = 'Visa letter downloaded (demo).';
            });
    }

    // Sidebar button handler
    sidebarButtons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            if (!currentUser) return;
            loadingOverlay.classList.remove('hidden');
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
                loadDashboardContent(this.id);
            }, 400);
        });
    });

    // Inactivity logout
    let inactivityTimer;
    const INACTIVITY_LIMIT = 5 * 60 * 1000;
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            if (currentUser) {
                alert("Logged out due to inactivity.");
                performLogout();
            }
        }, INACTIVITY_LIMIT);
    }
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(ev =>
        document.addEventListener(ev, resetInactivityTimer)
    );

    function performLogout() {
        dashboardLayout.classList.add('hidden');
        loginPage.classList.remove('hidden');
        loginForm.reset();
        currentUser = null;
        progressContainer.classList.add('hidden');
        sidebarButtons.forEach(btn => btn.classList.remove('active'));
    }

    function startInactivityTimer() { resetInactivityTimer(); }

});

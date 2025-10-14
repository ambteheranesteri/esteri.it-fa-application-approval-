document.addEventListener('DOMContentLoaded', () => {

    // --- Google Sheet CSV Link ---
    // This URL is used to fetch user data for login.
    const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmwyY9o-_Uupjvr1i_f8bVWr8g87FxkZLKeDeIxAHmXlNFP4q6uhx7yCcJv9z-lZq8NZ4EYL6OgUul/pub?gid=0&single=true&output=csv';

    // --- Global State ---
    let currentUser = null; // User data after successful login
    let csvData = { headers: [], rows: [] }; // Stores fetched CSV data

    // --- DOM elements ---
    const loginForm = document.getElementById('login-form');
    // NOTE: verificationForm element is no longer used
    const logoutBtn = document.getElementById('logout-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loginPage = document.getElementById('login-page');
    const dashboardLayout = document.getElementById('dashboard-layout');
    const loginError = document.getElementById('login-error');
    // NOTE: verificationError element is no longer used
    const dashboardContent = document.querySelector('.dashboard-content');
    const contentPlaceholder = document.getElementById('content-placeholder');
    // انتخاب دکمه‌ها و لینک‌های داشبورد
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
    
    // Define expected column headers for resilient matching
    const expectedHeaders = {
        'username': 'username',
        'password': 'password',
        'ceuNumber': 'ceuNumber',
        'name': 'name',
        'lastname': 'lastname',
        'gender': 'gender',
        // Keeping these headers defined for data retrieval, even if not used in login logic anymore
        'dateOfBirth': 'Date of birth', 
        'nationality': 'nationality',
        'passportNumber': 'passportNumber',
        'nationalIDNumber': 'nationalIDNumber',
    };


    /**
     * Finds the index of a header in a case-insensitive, space-tolerant manner.
     */
    function findHeaderIndex(targetHeader) {
        const normalizedTarget = targetHeader.trim().toLowerCase().replace(/\s/g, '');
        for (let i = 0; i < csvData.headers.length; i++) {
            const normalizedSheetHeader = csvData.headers[i].trim().toLowerCase().replace(/\s/g, '');
            if (normalizedSheetHeader === normalizedTarget) {
                return i;
            }
        }
        return -1; // Not found
    }

    /**
     * Fetches and processes the CSV data from the Google Sheet URL.
     */
    async function fetchCSVData() {
        if (csvData.rows.length > 0) return true; // Do not reload if already fetched
        try {
            const response = await fetch(sheetURL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            const rows = csvText.split('\n').map(r => r.split(',').map(c => c.trim().replace(/"/g, '')));
            csvData.headers = rows.shift().map(h => h.trim()); 
            csvData.rows = rows.filter(row => row.length === csvData.headers.length && row.some(cell => cell !== ''));
            return true;
        } catch (err) {
            console.error('Error fetching Google Sheet:', err);
            loginError.textContent = 'Error connecting to the data source. Check network or sheet URL.';
            loginError.classList.remove('hidden');
            return false;
        }
    }

    /**
     * Normalizes data for comparison.
     */
    function normalize(value) {
        if (!value) return '';
        const trimmedValue = value.toString().trim();
        // Keep date format (YYYY-MM-DD) for exact comparison
        if (trimmedValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return trimmedValue; 
        }
        return trimmedValue.toUpperCase(); // Uppercase everything else
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

    // === Progress Bar (Kept for dashboard functionality) ===
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
        progressMessage.textContent = message;
    }

    /**
     * === LOGIN: Single Step Credential Validation ===
     */
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        loadingOverlay.classList.remove('hidden');
        loginError.classList.add('hidden');

        const dataFetched = await fetchCSVData();
        if (!dataFetched) {
            loadingOverlay.classList.add('hidden');
            return;
        }
        
        // Get column indices using the resilient function
        const usernameIndex = findHeaderIndex(expectedHeaders.username);
        const passwordIndex = findHeaderIndex(expectedHeaders.password);
        const ceuIndex = findHeaderIndex(expectedHeaders.ceuNumber);

        // Check if required headers are found
        if (usernameIndex === -1 || passwordIndex === -1 || ceuIndex === -1) {
            loadingOverlay.classList.add('hidden');
            loginError.textContent = 'Configuration Error: Core login columns (username, password, ceuNumber) not found in data source.';
            loginError.classList.remove('hidden');
            return;
        }
        
        // Login inputs
        const username = normalize(document.getElementById('username').value);
        const password = normalize(document.getElementById('password').value);
        const ceuNumber = normalize(document.getElementById('ceu-number-login').value);

        const matchedRow = csvData.rows.find(row =>
            normalize(row[usernameIndex]) === username &&
            normalize(row[passwordIndex]) === password &&
            normalize(row[ceuIndex]) === ceuNumber
        );

        loadingOverlay.classList.add('hidden');

        if (matchedRow) {
            // Login Success: Direct to dashboard
            
            // Populate currentUser object with all row data
            currentUser = {};
            csvData.headers.forEach((h, i) => {
                // Use resilient indexing for known keys to ensure data is mapped correctly
                const key = Object.keys(expectedHeaders).find(k => findHeaderIndex(expectedHeaders[k]) === i);
                if (key) {
                    currentUser[expectedHeaders[key]] = matchedRow[i]?.trim();
                } else {
                    // Fallback for any other column in the sheet
                    currentUser[h.toLowerCase().replace(/\s/g, '')] = matchedRow[i]?.trim();
                }
            });

            // Ensure name fields are populated for the sidebar
            const nameIndex = findHeaderIndex(expectedHeaders.name);
            const lastnameIndex = findHeaderIndex(expectedHeaders.lastname);
            const genderIndex = findHeaderIndex(expectedHeaders.gender);

            currentUser.name = matchedRow[nameIndex]?.trim();
            currentUser.lastname = matchedRow[lastnameIndex]?.trim();
            currentUser.gender = matchedRow[genderIndex]?.trim();

            updateSidebarInfo();
            loginPage.classList.add('hidden');
            dashboardLayout.classList.remove('hidden');
            
            const progress = calculateProgress(currentUser);
            updateProgressUI(progress);

            // Start timer and load initial content
            loadDashboardContent('application-form-btn');
            document.getElementById('application-form-btn').classList.add('active');
            startInactivityTimer();

        } else {
            // Login Failure: Use the provided error message
            loginError.classList.remove('hidden');
        }
    });

    // === LOGOUT ===
    logoutBtn.addEventListener('click', () => {
        loadingOverlay.classList.remove('hidden');
        setTimeout(() => {
            performLogout();
            loadingOverlay.classList.add('hidden');
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
    if (!button) return;

    const title = button.textContent.trim();
    dashboardContent.querySelector('h2').textContent = title;

    let html = '';

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

        case 'upload-passport-btn':
            html = `
                <h3>Upload Passport</h3>
                <input type="file" id="passport-file" accept=".jpg,.jpeg,.png,.pdf" /><br><br>
                <button type="button" class="official-button" id="upload-passport">Upload</button>
                <p id="upload-status" style="margin-top:10px;"></p>
            `;
            break;

        case 'upload-photo-btn':
            html = `
                <h3>Upload Photo</h3>
                <input type="file" id="photo-file" accept="image/*" /><br><br>
                <button type="button" class="official-button" id="upload-photo">Upload Photo</button>
                <p id="photo-status" style="margin-top:10px;"></p>
            `;
            break;

        default:
            html = `<p>Loading data for <strong>${title}</strong>... This section is under development.</p>`;
    }

    contentPlaceholder.innerHTML = html;

    sidebarButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // Event listeners
    const saveBtn = document.getElementById('save-application-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            document.getElementById('app-form-status').textContent = 'Form saved (demo only).';
        });
    }

    const passportBtn = document.getElementById('upload-passport');
    if (passportBtn) {
        passportBtn.addEventListener('click', () => {
            const f = document.getElementById('passport-file');
            document.getElementById('upload-status').textContent =
                f && f.files.length ? 'Passport uploaded (demo).' : 'Please select a file first.';
        });
    }

    const photoBtn = document.getElementById('upload-photo');
    if (photoBtn) {
        photoBtn.addEventListener('click', () => {
            const f = document.getElementById('photo-file');
            document.getElementById('photo-status').textContent =
                f && f.files.length ? 'Photo uploaded (demo).' : 'Please select a file first.';
        });
    }
}


    sidebarButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault(); // prevents link default action if it's an <a> tag
            if (!currentUser) return;
            loadingOverlay.classList.remove('hidden');
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
                loadDashboardContent(this.id);
            }, 500);
        });
    });

    // === AUTO LOGOUT AFTER INACTIVITY ===
    let inactivityTimer;
    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes (in milliseconds)

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

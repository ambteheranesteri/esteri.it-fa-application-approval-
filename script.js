document.addEventListener('DOMContentLoaded', () => {

    // --- Google Sheet CSV Link ---
    // This URL is used to fetch user data for both login steps.
    const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmwyY9o-_Uupjvr1i_f8bVWr8g87FxkZLKeDeIxAHmXlNFP4q6uhx7yCcJv9z-lZq8NZ4EYL6OgUul/pub?gid=0&single=true&output=csv';

    // --- Global State ---
    let currentUser = null; // User data after successful final login
    let csvData = { headers: [], rows: [] }; // Stores fetched CSV data
    let stepOneSuccessRow = null; // Stores the matched row data after Step 1

    // --- DOM elements ---
    const loginForm = document.getElementById('login-form');
    const verificationForm = document.getElementById('verification-form'); // Step 2 form
    const logoutBtn = document.getElementById('logout-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loginPage = document.getElementById('login-page');
    const dashboardLayout = document.getElementById('dashboard-layout');
    const loginError = document.getElementById('login-error');
    const verificationError = document.getElementById('verification-error'); // Step 2 error message
    const dashboardContent = document.querySelector('.dashboard-content');
    const contentPlaceholder = document.getElementById('content-placeholder');
    const sidebarButtons = document.querySelectorAll('.dashboard-button');
    const applicantName = document.getElementById('applicant-name');
    const applicantCaseId = document.getElementById('applicant-case-id');
    const infoIcon = document.getElementById('info-icon');
    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    // const progressPercentage = document.getElementById('progress-percentage');
    const progressMessage = document.getElementById('progress-message');
    const signupMessageBox = document.getElementById('signup-message-box');
    const signupBtn = document.getElementById('signup-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');

    /**
     * Fetches and processes the CSV data from the Google Sheet URL.
     */
    async function fetchCSVData() {
        if (csvData.rows.length > 0) return true; // Do not reload if already fetched
        try {
            const response = await fetch(sheetURL);
            const csvText = await response.text();
            // Split rows and trim values
            const rows = csvText.split('\n').map(r => r.split(',').map(c => c.trim()));
            csvData.headers = rows.shift(); // First row is headers
            // Filter out incomplete or invalid rows
            csvData.rows = rows.filter(row => row.length === csvData.headers.length);
            return true;
        } catch (err) {
            console.error('Error fetching Google Sheet:', err);
            return false;
        }
    }

    /**
     * Normalizes data for comparison by trimming and converting to uppercase,
     * except for YYYY-MM-DD date format, which is only trimmed.
     */
    function normalize(value) {
        if (!value) return '';
        // Do not uppercase dates (YYYY-MM-DD) for exact comparison
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
        progressMessage.textContent = message;
    }

    /**
     * === STEP 1 LOGIN: Initial Credential Validation ===
     */
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        loadingOverlay.classList.remove('hidden');
        loginError.classList.add('hidden');
        verificationError.classList.add('hidden');
        loginForm.classList.remove('hidden'); 

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
            // ✅ Step 1 Success: Show Step 2 form
            loginForm.classList.add('hidden');
            verificationForm.classList.remove('hidden');
            // Clear Step 1 fields
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            document.getElementById('ceu-number-login').value = '';

        } else {
            // ❌ Step 1 Failure
            loginError.classList.remove('hidden');
        }
    });

    /**
     * === STEP 2 LOGIN: Security Details Validation ===
     * Date of Birth is optional in this step.
     */
    verificationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loadingOverlay.classList.remove('hidden');
        verificationError.classList.add('hidden');
        
        // If no row data from Step 1, session expired or error
        if (!stepOneSuccessRow) {
             loadingOverlay.classList.add('hidden');
             verificationError.textContent = 'Session expired. Please start login from Step 1.';
             verificationError.classList.remove('hidden');
             verificationForm.classList.add('hidden');
             loginForm.classList.remove('hidden');
             return;
        }

        // Step 2 inputs
        const inputName = normalize(document.getElementById('verification-name').value);
        const inputLastname = normalize(document.getElementById('verification-lastname').value);
        // Date input, only trim (must match YYYY-MM-DD format if provided)
        const inputDOB = document.getElementById('verification-dateOfBirth').value.trim(); 
        const inputNationality = normalize(document.getElementById('verification-nationality').value);
        const inputPassport = normalize(document.getElementById('verification-passportNumber').value);
        const inputNationalID = normalize(document.getElementById('verification-nationalIDNumber').value);
        const inputGender = normalize(document.getElementById('verification-gender').value);
        
        // Get column indices
        const nameIndex = csvData.headers.indexOf('name');
        const lastnameIndex = csvData.headers.indexOf('lastname');
        const dobIndex = csvData.headers.indexOf('dateOfBirth');
        const nationalityIndex = csvData.headers.indexOf('nationality');
        const passportIndex = csvData.headers.indexOf('passportNumber');
        const nationalIDIndex = csvData.headers.indexOf('nationalIDNumber');
        const genderIndex = csvData.headers.indexOf('gender');
        
        
        // --- Logic for Optional Date of Birth Field ---
        let dobMatch = true;
        
        // Only check for match if the user provided an input
        if (inputDOB) {
            // Must match the CSV data if provided
            dobMatch = normalize(stepOneSuccessRow[dobIndex]) === normalize(inputDOB);
        } else if (normalize(stepOneSuccessRow[dobIndex])) {
            // If the user left it blank, but the data exists in CSV, it's still considered a match 
            // because the field is optional for the user.
             dobMatch = true;
        }
        // If both are empty, dobMatch is true (initial value)
        // --------------------------------------------------

        // Final Validation
        const isMatch = 
            normalize(stepOneSuccessRow[nameIndex]) === inputName &&
            normalize(stepOneSuccessRow[lastnameIndex]) === inputLastname &&
            dobMatch && // Apply DOB optional logic
            normalize(stepOneSuccessRow[nationalityIndex]) === inputNationality &&
            normalize(stepOneSuccessRow[passportIndex]) === inputPassport &&
            normalize(stepOneSuccessRow[nationalIDIndex]) === inputNationalID &&
            normalize(stepOneSuccessRow[genderIndex]) === inputGender;

        loadingOverlay.classList.add('hidden');

        if (isMatch) {
            // ✅ Step 2 Success: Final Login
            
            // Populate currentUser object with all row data
            currentUser = {};
            csvData.headers.forEach((h, i) => currentUser[h] = stepOneSuccessRow[i]?.trim());
            
            // Ensure necessary fields are updated/set in currentUser
            currentUser.name = document.getElementById('verification-name').value.trim() || currentUser.name;
            currentUser.lastname = document.getElementById('verification-lastname').value.trim() || currentUser.lastname;
            currentUser.gender = document.getElementById('verification-gender').value.trim() || currentUser.gender;


            updateSidebarInfo();
            loginPage.classList.add('hidden');
            dashboardLayout.classList.remove('hidden');
            verificationForm.classList.add('hidden');
            
            const progress = calculateProgress(currentUser);
            updateProgressUI(progress);

            // ✅ Start timer and load initial content
            loadDashboardContent('application-form-btn');
            document.getElementById('application-form-btn').classList.add('active');
            startInactivityTimer();

        } else {
            // ❌ Step 2 Failure
            verificationError.textContent = 'Error: Incorrect information. Please check all fields and try again.';
            verificationError.classList.remove('hidden');
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
            verificationForm.classList.add('hidden'); // Hide Step 2 form
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
        // Clean up text content
        const title = button.textContent.replace(' ', '').trim(); 
        
        // Update main header
        dashboardContent.querySelector('h2').textContent = title;
        
        // Update Placeholder content
        contentPlaceholder.innerHTML = `<p>Loading data for <strong>${title}</strong>... This section is under development.</p>`;
        
        // Activate the menu button
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

    // Reset timer on user activity
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
        document.addEventListener(evt, resetInactivityTimer);
    });

    function performLogout() {
        dashboardLayout.classList.add('hidden');
        loginPage.classList.remove('hidden');
        loginForm.reset();
        verificationForm.reset(); // Clear Step 2 fields
        loginForm.classList.remove('hidden'); // Show Step 1 form
        verificationForm.classList.add('hidden'); // Hide Step 2 form
        
        loginError.classList.add('hidden');
        verificationError.classList.add('hidden');

        currentUser = null;
        stepOneSuccessRow = null; // Clear Step 1 data
        
        progressContainer.classList.add('hidden');
        sidebarButtons.forEach(btn => btn.classList.remove('active'));
    }

    function startInactivityTimer() {
        resetInactivityTimer();
    }
});

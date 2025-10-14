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
    const progressMessage = document.getElementById('progress-message');
    const signupMessageBox = document.getElementById('signup-message-box');
    const signupBtn = document.getElementById('signup-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    
    // Define all expected column headers for case-insensitive matching
    // NOTE: Even though the sheet uses specific casing, the findHeaderIndex function handles it.
    const expectedHeaders = {
        'username': 'username',
        'password': 'password',
        'ceuNumber': 'ceuNumber',
        'name': 'name',
        'lastname': 'lastname',
        // CRUCIAL: Using 'date of birth' for space/case-tolerant matching
        'dateOfBirth': 'Date of birth', 
        'nationality': 'nationality',
        'passportNumber': 'passportNumber',
        'nationalIDNumber': 'nationalIDNumber',
        'gender': 'gender'
    };


    /**
     * Finds the index of a header in a case-insensitive, space-tolerant manner.
     * This is the key fix for handling 'Date of birth' and other variations.
     */
    function findHeaderIndex(targetHeader) {
        // Normalize target: remove spaces and convert to lower case
        const normalizedTarget = targetHeader.trim().toLowerCase().replace(/\s/g, '');
        for (let i = 0; i < csvData.headers.length; i++) {
            // Normalize sheet header: remove spaces and convert to lower case
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
            // Check for potential server/network issues
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            // Split rows and trim values
            const rows = csvText.split('\n').map(r => r.split(',').map(c => c.trim().replace(/"/g, '')));
            csvData.headers = rows.shift().map(h => h.trim()); // First row is headers
            // Filter out incomplete or invalid rows
            csvData.rows = rows.filter(row => row.length === csvData.headers.length && row.some(cell => cell !== ''));
            return true;
        } catch (err) {
            console.error('Error fetching Google Sheet:', err);
            // Show a generic error on login screen
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
        // Check for YYYY-MM-DD date format
        if (trimmedValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return trimmedValue; // Keep date format for exact comparison (no uppercase)
        }
        return trimmedValue.toUpperCase(); // Uppercase everything else for case-insensitive matching
    }

    // === Sidebar Info Update ===
    function updateSidebarInfo() {
        if (currentUser) {
            // Use fallback for names just in case
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
            // Checks if the field exists and contains a non-empty string that looks like a URL
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
            return; // Error message already set in fetchCSVData
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
        
        // Headers used in Step 1
        const username = normalize(document.getElementById('username').value);
        const password = normalize(document.getElementById('password').value);
        const ceuNumber = normalize(document.getElementById('ceu-number-login').value);

        stepOneSuccessRow = csvData.rows.find(row =>
            normalize(row[usernameIndex]) === username &&
            normalize(row[passwordIndex]) === password &&
            normalize(row[ceuIndex]) === ceuNumber
        );

        loadingOverlay.classList.add('hidden');

        if (stepOneSuccessRow) {
            // Step 1 Success: Show Step 2 form
            loginForm.classList.add('hidden');
            verificationForm.classList.remove('hidden');
            // Clear Step 1 fields
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            document.getElementById('ceu-number-login').value = '';

        } else {
            // Step 1 Failure: Use the provided error message
            loginError.classList.remove('hidden');
        }
    });

    /**
     * === STEP 2 LOGIN: Security Details Validation ===
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
        const inputDOB = document.getElementById('verification-dateOfBirth').value.trim(); // YYYY-MM-DD format
        const inputNationality = normalize(document.getElementById('verification-nationality').value);
        const inputPassport = normalize(document.getElementById('verification-passportNumber').value);
        const inputNationalID = normalize(document.getElementById('verification-nationalIDNumber').value);
        const inputGender = normalize(document.getElementById('verification-gender').value);
        
        // Get column indices using the resilient function
        const nameIndex = findHeaderIndex(expectedHeaders.name);
        const lastnameIndex = findHeaderIndex(expectedHeaders.lastname);
        const dobIndex = findHeaderIndex(expectedHeaders.dateOfBirth); 
        const nationalityIndex = findHeaderIndex(expectedHeaders.nationality);
        const passportIndex = findHeaderIndex(expectedHeaders.passportNumber);
        const nationalIDIndex = findHeaderIndex(expectedHeaders.nationalIDNumber);
        const genderIndex = findHeaderIndex(expectedHeaders.gender);
        
        // Check for missing crucial headers
        if ([nameIndex, lastnameIndex, nationalityIndex, passportIndex, nationalIDIndex, genderIndex].some(index => index === -1)) {
             loadingOverlay.classList.add('hidden');
             verificationError.textContent = 'Configuration Error: Required personal detail columns not found in data source.';
             verificationError.classList.remove('hidden');
             return;
        }


        // --- LOGIC FOR DATE OF BIRTH ---
        let dobMatch = true;
        
        // Get CSV value (normalized for dates: just trim, no uppercase)
        // Ensure to check if dobIndex is valid before accessing array
        const csvDOB = dobIndex !== -1 ? normalize(stepOneSuccessRow[dobIndex]) : '';

        // Case 1: User provides DOB (inputDOB is NOT empty)
        if (inputDOB) {
            // Must match CSV data exactly (YYYY-MM-DD vs YYYY-MM-DD)
            dobMatch = csvDOB === inputDOB; 
        } 
        // Case 2: User left DOB blank (inputDOB IS empty)
        else {
            // The field is optional, so if the user leaves it blank, the verification passes for this field.
            dobMatch = true;
        }
        // -------------------------------


        // Final Validation (All required fields must match)
        const isMatch = 
            normalize(stepOneSuccessRow[nameIndex]) === inputName &&
            normalize(stepOneSuccessRow[lastnameIndex]) === inputLastname &&
            dobMatch && // Apply DOB logic here
            normalize(stepOneSuccessRow[nationalityIndex]) === inputNationality &&
            normalize(stepOneSuccessRow[passportIndex]) === inputPassport &&
            normalize(stepOneSuccessRow[nationalIDIndex]) === inputNationalID &&
            normalize(stepOneSuccessRow[genderIndex]) === inputGender;

        loadingOverlay.classList.add('hidden');

        if (isMatch) {
            // Step 2 Success: Final Login
            
            // Populate currentUser object with all row data
            currentUser = {};
            csvData.headers.forEach((h, i) => currentUser[h] = stepOneSuccessRow[i]?.trim());
            
            // Ensure necessary fields are updated/set in currentUser (e.g., in case of blank cells)
            currentUser.name = document.getElementById('verification-name').value.trim() || currentUser.name;
            currentUser.lastname = document.getElementById('verification-lastname').value.trim() || currentUser.lastname;
            currentUser.gender = document.getElementById('verification-gender').value.trim() || currentUser.gender;


            updateSidebarInfo();
            loginPage.classList.add('hidden');
            dashboardLayout.classList.remove('hidden');
            verificationForm.classList.add('hidden');
            
            const progress = calculateProgress(currentUser);
            updateProgressUI(progress);

            // Start timer and load initial content
            loadDashboardContent('application-form-btn');
            document.getElementById('application-form-btn').classList.add('active');
            startInactivityTimer();

        } else {
            // Step 2 Failure
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
        const title = button.textContent.replace(' ', '').trim(); 
        
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

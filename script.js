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

    // **Section 1: Login Logic**
    loginForm.addEventListener('submit', function(e) {
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
                // Successful login, proceed to search page
                showPage('search-page');
                searchForm.reset(); 
                trackButton.disabled = true;
            } else {
                loginError.classList.remove('hidden');
            }
        }, 5000); // 5 second delay
    });

    // **Section 2: General Search Logic**
    
    // Enable/disable the tracking button based on required fields
    searchForm.addEventListener('input', function() {
        const requiredFields = [
            document.getElementById('search-name'),
            document.getElementById('search-lastname'),
            document.getElementById('search-nationality'),
            document.getElementById('search-national-id'),
            document.getElementById('search-ceu'),
            document.getElementById('search-gender')
        ];
        
        // Check if all required fields are filled
        const allRequiredFilled = requiredFields.every(field => field.value.trim() !== "");
        trackButton.disabled = !allRequiredFilled;
    });

    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        searchError.classList.add('hidden');

        // Collect search data
        const searchData = {
            name: document.getElementById('search-name').value.trim(),
            lastname: document.getElementById('search-lastname').value.trim(),
            nationality: document.getElementById('search-nationality').value.trim(),
            passportNumber: document.getElementById('search-passport').value.trim(),
            nationalIDNumber: document.getElementById('search-national-id').value.trim(),
            ceuNumber: document.getElementById('search-ceu').value.trim(),
            gender: document.getElementById('search-gender').value
        };

        // Find a matching user record
        const match = userData.find(user => 
            user.name.toLowerCase() === searchData.name.toLowerCase() && 
            user.lastname.toLowerCase() === searchData.lastname.toLowerCase() && 
            user.nationality.toLowerCase() === searchData.nationality.toLowerCase() && 
            user.nationalIDNumber === searchData.nationalIDNumber && 
            user.ceuNumber === searchData.ceuNumber && 
            user.gender === searchData.gender &&
            // Check Passport Number only if it was entered in the search form
            (searchData.passportNumber === "" || user.passportNumber === searchData.passportNumber)
        );

        showLoading();

        setTimeout(() => {
            hideLoading();
            if (match) {
                // Successful search, proceed to dashboard
                showPage('dashboard-page');
            } else {
                searchError.classList.remove('hidden');
            }
        }, 5000); // 5 second delay
    });
});
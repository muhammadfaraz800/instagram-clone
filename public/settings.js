
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.querySelector('.settings-container');
    const formInputs = document.querySelectorAll('.input-field, .custom-checkbox-input');
    const submitBtn = document.querySelector('.submit-btn');
    const privateAccountCheckbox = document.getElementById('privateAccount');
    const privateAccountRow = document.querySelector('.checkbox-group');
    const changePhotoBtn = document.querySelector('.change-photo-btn');

    // Field references
    const nameInput = document.getElementById('profileName') || document.querySelector('input[placeholder="Name"]');
    const emailInput = document.querySelector('input[placeholder="Email"]');
    const bioInput = document.querySelector('textarea[placeholder="Bio"]');
    const websiteInput = document.getElementById('website');
    const contactInput = document.getElementById('contact');
    const businessTypeInput = document.getElementById('businessType');
    const genderSelect = document.getElementById('gender');

    // Profile photo & headers
    const usernameDisplay = document.querySelector('.header-text .username');
    const nameDisplay = document.querySelector('.header-text .name');
    const profilePic = document.querySelector('.profile-pic-medium img');

    let initialValues = new Map();
    let userAccountType = 'personal';

    // --- Core Function: Populate Form ---
    function populateForm(data) {
        // Determine Account Type
        if (data.BUSINESS_TYPE) {
            userAccountType = 'business';
        } else {
            userAccountType = 'personal';
        }

        // Common Fields
        if (usernameDisplay) usernameDisplay.textContent = data.USERNAME || '';
        if (nameDisplay) nameDisplay.textContent = data.PROFILE_NAME || '';
        if (profilePic && data.PROFILE_PICTURE_URL) profilePic.src = data.PROFILE_PICTURE_URL;

        if (nameInput) nameInput.value = data.PROFILE_NAME || '';
        if (emailInput) emailInput.value = data.EMAIL || '';
        if (bioInput) bioInput.value = data.BIO || '';

        // Visibility
        if (privateAccountCheckbox) {
            const isPrivate = (data.VISIBILITY === 'Private');
            privateAccountCheckbox.checked = isPrivate;
        }

        // Specific Fields
        if (userAccountType === 'business') {
            if (websiteInput) websiteInput.value = data.WEBSITE || '';
            if (contactInput) contactInput.value = data.CONTACTNO || '';
            if (businessTypeInput) businessTypeInput.value = data.BUSINESS_TYPE || '';
        } else {
            if (genderSelect) {
                const genderVal = (data.GENDER || 'prefer_not_to_say').toLowerCase();
                const options = Array.from(genderSelect.options).map(o => o.value);
                if (options.includes(genderVal)) {
                    genderSelect.value = genderVal;
                } else {
                    genderSelect.value = 'prefer_not_to_say';
                }
            }
        }

        // Show/Hide Logic based on Account Type
        const businessFields = document.querySelectorAll('.field-business');
        const personalFields = document.querySelectorAll('.field-personal');

        if (userAccountType === 'business') {
            businessFields.forEach(el => el.style.display = 'block');
            personalFields.forEach(el => el.style.display = 'none');
            if (changePhotoBtn) changePhotoBtn.style.display = 'inline-block';
        } else {
            personalFields.forEach(el => el.style.display = 'block');
            businessFields.forEach(el => el.style.display = 'none');
            const checkboxGroup = document.querySelector('.checkbox-group.field-personal');
            if (checkboxGroup) checkboxGroup.style.display = 'flex';
            if (changePhotoBtn) changePhotoBtn.style.display = 'inline-block';
        }
    }

    // --- Core Function: Snapshot Initial Values ---
    function updateInitialValues() {
        initialValues.clear();
        formInputs.forEach(input => {
            if (input.type === 'checkbox') {
                initialValues.set(input, input.checked);
            } else {
                initialValues.set(input, input.value);
            }
        });
        checkDirty(); // Reset button state
    }

    // --- 1. Load from Cache (Optimization) ---
    const cachedData = localStorage.getItem('userSettingsCache');
    if (cachedData) {
        try {
            const data = JSON.parse(cachedData);
            populateForm(data);
            updateInitialValues(); // Set baseline from cache
            if (container) container.style.display = 'block';
        } catch (e) {
            console.error("Error parsing settings cache", e);
        }
    }

    // --- 2. Fetch Fresh Data ---
    try {
        const response = await fetch('/api/user/settings');

        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        if (response.ok) {
            const data = await response.json();

            // Save to Cache
            localStorage.setItem('userSettingsCache', JSON.stringify(data));

            // Update UI
            populateForm(data);
            updateInitialValues(); // Update baseline to fresh data

            if (container) container.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading settings from network:', error);
        // If cache existed, user still sees something. If not, maybe show error?
        if (!cachedData && container) container.style.display = 'none';
    }


    // --- Dirty Check Logic ---
    function checkDirty() {
        let isDirty = false;
        formInputs.forEach(input => {
            if (input.offsetParent !== null) { // Only visible inputs
                if (!initialValues.has(input)) return;
                const initial = initialValues.get(input);
                if (input.type === 'checkbox') {
                    if (input.checked !== initial) isDirty = true;
                } else {
                    if (input.value !== initial) isDirty = true;
                }
            }
        });

        if (isDirty) {
            submitBtn.removeAttribute('disabled');
            submitBtn.style.opacity = '1';
        } else {
            submitBtn.setAttribute('disabled', 'true');
            submitBtn.style.opacity = '0.4';
        }
    }

    formInputs.forEach(input => {
        input.addEventListener('input', checkDirty);
        input.addEventListener('change', checkDirty);
    });

    // Private Account Checkbox Area Click
    if (privateAccountRow && privateAccountCheckbox) {
        privateAccountRow.addEventListener('click', (e) => {
            if (e.target !== privateAccountCheckbox && !privateAccountCheckbox.disabled) {
                if (privateAccountRow.offsetParent !== null) {
                    privateAccountCheckbox.checked = !privateAccountCheckbox.checked;
                    checkDirty();
                }
            }
        });
    }

    // --- Save Logic (Update Local Storage on Success) ---
    if (submitBtn) {
        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const payload = {
                profile_name: nameInput.value,
                email: emailInput.value,
                bio: bioInput.value,
                // Add other logic as per schema needs
            };

            // Business/Personal specific payload construction
            if (userAccountType === 'business') {
                payload.website = websiteInput.value;
                payload.contact_no = contactInput.value;
            } else {
                payload.gender = genderSelect.value;
                payload.visibility = privateAccountCheckbox.checked ? 'Private' : 'Public';
            }

            try {
                // Assuming POST or PUT to /api/user/update
                // Note: You might need to check your exact route requirements in src/routes/user.js
                // Assuming it expects `firstname`, `lastname`, or just a general update object.
                // Let's assume a generic update endpoint for now or userController update logic.
                // Looking at userController.js in previous turns, 'updateUser' just took firstname/lastname.
                // We might need to ensure the backend supports this update. 
                // For now, I'll write the client side logic.

                const response = await fetch('/api/user/update', {
                    method: 'POST', // or PUT
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    // Success!

                    // 1. Alert user (or toast)
                    alert('Profile saved!');

                    // 2. RE-FETCH data to ensure cache is 100% in sync with server state (canonical source)
                    // OR manually update the cache object if we trust the payload.
                    // Verification fetching is safer.
                    const verifyResponse = await fetch('/api/user/settings');
                    if (verifyResponse.ok) {
                        const freshData = await verifyResponse.json();
                        localStorage.setItem('userSettingsCache', JSON.stringify(freshData));
                        populateForm(freshData);
                        updateInitialValues();
                    }

                } else {
                    const err = await response.json();
                    alert('Failed to save: ' + (err.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error saving profile:', error);
                alert('An error occurred while saving.');
            }
        });
    }
});

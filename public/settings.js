
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
        if (nameDisplay) {
            const accountTypeLabel = (userAccountType === 'business') ? 'Business' : 'Personal';
            nameDisplay.textContent = (data.PROFILE_NAME || '') + ` • ${accountTypeLabel}`;
        }
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
                payload.business_type = businessTypeInput ? businessTypeInput.value : 'Business';
            } else {
                payload.gender = genderSelect.value;
                payload.visibility = privateAccountCheckbox.checked ? 'Private' : 'Public';
            }

            try {

                const response = await fetch('/api/user/update', {
                    method: 'PUT', // or POST
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

    // ========================================
    // IMAGE EDITOR FUNCTIONALITY
    // ========================================

    const pfpFileInput = document.getElementById('pfpFileInput');
    const imageEditorModal = document.getElementById('imageEditorModal');
    const closeEditorBtn = document.getElementById('closeEditorBtn');
    const editorCanvas = document.getElementById('editorCanvas');
    const editorCanvasContainer = document.getElementById('editorCanvasContainer');
    const cropBox = document.getElementById('cropBox');
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomLabel = document.getElementById('zoomLabel');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const savePhotoBtn = document.getElementById('savePhotoBtn');

    let originalImage = null;
    let currentZoom = 100;
    let currentFilter = 'none';
    let ctx = editorCanvas ? editorCanvas.getContext('2d') : null;

    // Image position for panning
    let imageX = 0;
    let imageY = 0;

    // Crop box state
    let cropState = {
        x: 50,
        y: 50,
        size: 200
    };

    // Filter mappings
    const filterMap = {
        'none': 'none',
        'grayscale': 'grayscale(100%)',
        'sepia': 'sepia(100%)',
        'brightness': 'brightness(130%)',
        'contrast': 'contrast(130%)',
        'saturate': 'saturate(150%)',
        'blur': 'blur(2px)'
    };

    // Open file picker when "Change photo" is clicked
    if (changePhotoBtn && pfpFileInput) {
        changePhotoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            pfpFileInput.click();
        });
    }

    // Handle file selection
    if (pfpFileInput) {
        pfpFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                loadImageToEditor(event.target.result);
            };
            reader.readAsDataURL(file);
        });
    }

    // Load image into editor
    function loadImageToEditor(src) {
        originalImage = new Image();
        originalImage.onload = () => {
            openEditor();
            drawCanvas();
            initCropBox();
        };
        originalImage.src = src;
    }

    // Open the editor modal
    function openEditor() {
        if (imageEditorModal) {
            imageEditorModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            currentZoom = 100;
            currentFilter = 'none';
            if (zoomSlider) zoomSlider.value = 100;
            if (zoomLabel) zoomLabel.textContent = '100%';

            // Reset filter buttons
            filterBtns.forEach(btn => btn.classList.remove('active'));
            const noneBtn = document.querySelector('.filter-btn[data-filter="none"]');
            if (noneBtn) noneBtn.classList.add('active');
        }
    }

    // Close the editor modal
    function closeEditor() {
        if (imageEditorModal) {
            imageEditorModal.classList.remove('active');
            document.body.style.overflow = '';
            if (pfpFileInput) pfpFileInput.value = '';
        }
    }

    if (closeEditorBtn) {
        closeEditorBtn.addEventListener('click', closeEditor);
    }

    // Close on outside click
    if (imageEditorModal) {
        imageEditorModal.addEventListener('click', (e) => {
            if (e.target === imageEditorModal) {
                closeEditor();
            }
        });
    }

    // Draw the canvas with current zoom and filter
    function drawCanvas() {
        if (!originalImage || !ctx || !editorCanvas) return;

        const containerWidth = editorCanvasContainer.clientWidth;
        const containerHeight = editorCanvasContainer.clientHeight;

        // Calculate scaled dimensions
        const scale = currentZoom / 100;
        let imgWidth = originalImage.width * scale;
        let imgHeight = originalImage.height * scale;

        // Fit image to container while maintaining aspect ratio
        const containerRatio = containerWidth / containerHeight;
        const imageRatio = originalImage.width / originalImage.height;

        let baseWidth, baseHeight;
        if (imageRatio > containerRatio) {
            baseWidth = containerWidth;
            baseHeight = containerWidth / imageRatio;
        } else {
            baseHeight = containerHeight;
            baseWidth = containerHeight * imageRatio;
        }

        imgWidth = baseWidth * scale;
        imgHeight = baseHeight * scale;

        // Set canvas size to container size
        editorCanvas.width = containerWidth;
        editorCanvas.height = containerHeight;

        // Clear canvas
        ctx.clearRect(0, 0, containerWidth, containerHeight);

        // Apply filter
        ctx.filter = filterMap[currentFilter] || 'none';

        // Calculate centered position
        const drawX = (containerWidth - imgWidth) / 2 + imageX;
        const drawY = (containerHeight - imgHeight) / 2 + imageY;

        // Draw the image
        ctx.drawImage(originalImage, drawX, drawY, imgWidth, imgHeight);

        // Reset filter
        ctx.filter = 'none';
    }

    // Initialize crop box to center
    function initCropBox() {
        if (!cropBox || !editorCanvasContainer) return;

        const containerWidth = editorCanvasContainer.clientWidth;
        const containerHeight = editorCanvasContainer.clientHeight;

        // Make crop box 60% of container, square
        const size = Math.min(containerWidth, containerHeight) * 0.6;
        const x = (containerWidth - size) / 2;
        const y = (containerHeight - size) / 2;

        cropState = { x, y, size };
        updateCropBox();
    }

    // Update crop box position and size
    function updateCropBox() {
        if (!cropBox) return;
        cropBox.style.left = cropState.x + 'px';
        cropBox.style.top = cropState.y + 'px';
        cropBox.style.width = cropState.size + 'px';
        cropBox.style.height = cropState.size + 'px';
    }

    // Crop box dragging
    let isDragging = false;
    let isResizing = false;
    let resizeHandle = null;
    let startX, startY, startCropX, startCropY, startCropSize;

    if (cropBox) {
        cropBox.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('crop-handle')) {
                isResizing = true;
                resizeHandle = e.target;
            } else {
                isDragging = true;
            }
            startX = e.clientX;
            startY = e.clientY;
            startCropX = cropState.x;
            startCropY = cropState.y;
            startCropSize = cropState.size;
            e.preventDefault();
        });
    }

    document.addEventListener('mousemove', (e) => {
        if (!isDragging && !isResizing) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const containerWidth = editorCanvasContainer.clientWidth;
        const containerHeight = editorCanvasContainer.clientHeight;

        if (isDragging) {
            // Move crop box
            let newX = startCropX + deltaX;
            let newY = startCropY + deltaY;

            // Constrain to container
            newX = Math.max(0, Math.min(newX, containerWidth - cropState.size));
            newY = Math.max(0, Math.min(newY, containerHeight - cropState.size));

            cropState.x = newX;
            cropState.y = newY;
        } else if (isResizing) {
            // Resize crop box (maintain 1:1 ratio)
            const handleClass = resizeHandle.className;
            let delta = Math.max(Math.abs(deltaX), Math.abs(deltaY));

            if (handleClass.includes('bottom-right')) {
                delta = Math.max(deltaX, deltaY);
                let newSize = startCropSize + delta;
                newSize = Math.max(50, Math.min(newSize, containerWidth - startCropX, containerHeight - startCropY));
                cropState.size = newSize;
            } else if (handleClass.includes('top-left')) {
                delta = Math.min(deltaX, deltaY);
                let newSize = startCropSize - delta;
                newSize = Math.max(50, Math.min(newSize, startCropX + startCropSize, startCropY + startCropSize));
                const sizeDiff = newSize - startCropSize;
                cropState.size = newSize;
                cropState.x = startCropX - sizeDiff;
                cropState.y = startCropY - sizeDiff;
            } else if (handleClass.includes('top-right')) {
                let sizeChange = Math.max(-deltaY, deltaX);
                let newSize = startCropSize + sizeChange;
                newSize = Math.max(50, Math.min(newSize, containerWidth - startCropX, startCropY + startCropSize));
                const sizeDiff = newSize - startCropSize;
                cropState.size = newSize;
                cropState.y = startCropY - sizeDiff;
            } else if (handleClass.includes('bottom-left')) {
                let sizeChange = Math.max(deltaY, -deltaX);
                let newSize = startCropSize + sizeChange;
                newSize = Math.max(50, Math.min(newSize, startCropX + startCropSize, containerHeight - startCropY));
                const sizeDiff = newSize - startCropSize;
                cropState.size = newSize;
                cropState.x = startCropX - sizeDiff;
            }
        }

        updateCropBox();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        isResizing = false;
        resizeHandle = null;
    });

    // Zoom controls
    if (zoomSlider) {
        zoomSlider.addEventListener('input', (e) => {
            currentZoom = parseInt(e.target.value);
            if (zoomLabel) zoomLabel.textContent = currentZoom + '%';
            drawCanvas();
        });
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            currentZoom = Math.min(200, currentZoom + 10);
            if (zoomSlider) zoomSlider.value = currentZoom;
            if (zoomLabel) zoomLabel.textContent = currentZoom + '%';
            drawCanvas();
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            currentZoom = Math.max(50, currentZoom - 10);
            if (zoomSlider) zoomSlider.value = currentZoom;
            if (zoomLabel) zoomLabel.textContent = currentZoom + '%';
            drawCanvas();
        });
    }

    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            drawCanvas();
        });
    });

    // Save/Upload photo
    if (savePhotoBtn) {
        savePhotoBtn.addEventListener('click', async () => {
            if (!originalImage) return;

            // Show loading
            savePhotoBtn.classList.add('loading');
            savePhotoBtn.disabled = true;

            try {
                // Create a temporary canvas for the cropped result
                const cropCanvas = document.createElement('canvas');
                const cropCtx = cropCanvas.getContext('2d');

                // Set output size (square)
                const outputSize = 400; // Final image will be 400x400
                cropCanvas.width = outputSize;
                cropCanvas.height = outputSize;

                // Calculate the crop region relative to the displayed image
                const containerWidth = editorCanvasContainer.clientWidth;
                const containerHeight = editorCanvasContainer.clientHeight;

                // Get displayed image dimensions
                const scale = currentZoom / 100;
                const containerRatio = containerWidth / containerHeight;
                const imageRatio = originalImage.width / originalImage.height;

                let baseWidth, baseHeight;
                if (imageRatio > containerRatio) {
                    baseWidth = containerWidth;
                    baseHeight = containerWidth / imageRatio;
                } else {
                    baseHeight = containerHeight;
                    baseWidth = containerHeight * imageRatio;
                }

                const displayedWidth = baseWidth * scale;
                const displayedHeight = baseHeight * scale;

                // Image position on canvas
                const imgX = (containerWidth - displayedWidth) / 2;
                const imgY = (containerHeight - displayedHeight) / 2;

                // Calculate crop region in original image coordinates
                const scaleX = originalImage.width / displayedWidth;
                const scaleY = originalImage.height / displayedHeight;

                const srcX = (cropState.x - imgX) * scaleX;
                const srcY = (cropState.y - imgY) * scaleY;
                const srcSize = cropState.size * scaleX;

                // Apply filter
                cropCtx.filter = filterMap[currentFilter] || 'none';

                // Draw the cropped region
                cropCtx.drawImage(
                    originalImage,
                    Math.max(0, srcX), Math.max(0, srcY), srcSize, srcSize,
                    0, 0, outputSize, outputSize
                );

                // Convert to blob
                const blob = await new Promise(resolve => {
                    cropCanvas.toBlob(resolve, 'image/png', 0.95);
                });

                // Upload
                const formData = new FormData();
                formData.append('profilePicture', blob, 'profile.png');

                const response = await fetch('/api/user/upload-pfp', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();

                    // Update profile picture in the UI
                    if (profilePic && result.profilePictureUrl) {
                        profilePic.src = result.profilePictureUrl + '?t=' + Date.now();
                    }

                    // Update cache
                    const cachedData = localStorage.getItem('userSettingsCache');
                    if (cachedData) {
                        const data = JSON.parse(cachedData);
                        data.PROFILE_PICTURE_URL = result.profilePictureUrl;
                        localStorage.setItem('userSettingsCache', JSON.stringify(data));
                    }

                    alert('Profile picture updated!');
                    closeEditor();
                } else {
                    const err = await response.json();
                    alert('Failed to upload: ' + (err.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error uploading profile picture:', error);
                alert('An error occurred while uploading.');
            } finally {
                savePhotoBtn.classList.remove('loading');
                savePhotoBtn.disabled = false;
            }
        });
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (imageEditorModal && imageEditorModal.classList.contains('active')) {
            drawCanvas();
            initCropBox();
        }
    });
});



// ============================================
// CENTRALIZED CONSTANTS
// ============================================
const REEL_DURATION_VERIFIED = 60;  // seconds - for verified users
const REEL_DURATION_NORMAL = 40;    // seconds - for normal users
const DEFAULT_AVATAR_PATH = '/uploads/default/default-avatar.png';
document.addEventListener("DOMContentLoaded", function () {
    const sidebarContainer = document.getElementById("sidebar-container");
    if (!sidebarContainer) return;

    // State for notifications
    let followRequests = [];

    // Fetch pending follow requests from API
    async function fetchFollowRequests() {
        try {
            const response = await fetch('/api/notifications/requests');
            if (response.ok) {
                followRequests = await response.json();
            } else {
                followRequests = [];
            }
        } catch (error) {
            console.error('Error fetching follow requests:', error);
            followRequests = [];
        }
        return followRequests;
    }

    // Generate notification items HTML from follow requests
    function generateNotificationItems() {
        if (followRequests.length === 0) {
            return '<div class="notif-empty">No new notifications</div>';
        }

        return followRequests.map(request => {
            return `
                <div class="notification-item" data-username="${request.username}">
                    <div class="notif-avatar">
                        <img src="${request.profilePictureUrl}" alt="${request.username}">
                    </div>
                <div class="notif-content">
                        <span class="notif-username">
                            ${request.username}
                            ${(request.verificationStatus === 'Verified') ? `
                            <span class="verified-badge-small" title="Verified" style="margin-left: 2px; vertical-align: text-bottom;">
                                <svg aria-label="Verified" class="x1lliihq x1n2onr6" fill="rgb(0, 149, 246)" height="12" role="img" viewBox="0 0 40 40" width="12">
                                    <title>Verified</title>
                                    <path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fill-rule="evenodd"></path>
                                </svg>
                            </span>` : ''}
                        </span>
                        <span class="notif-message">requested to follow you.</span>
                    </div>
                    <div class="notif-actions">
                        <button class="notif-btn notif-btn-confirm" data-username="${request.username}">Confirm</button>
                        <button class="notif-btn notif-btn-delete" data-username="${request.username}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Handle accept follow request
    async function handleAcceptRequest(username) {
        try {
            const response = await fetch(`/api/notifications/requests/${username}/accept`, {
                method: 'POST'
            });

            if (response.ok) {
                // Remove from local state and re-render
                followRequests = followRequests.filter(r => r.username !== username);
                updateNotificationsList();
            }
        } catch (error) {
            console.error('Error accepting request:', error);
        }
    }

    // Handle reject follow request
    async function handleRejectRequest(username) {
        try {
            const response = await fetch(`/api/notifications/requests/${username}/reject`, {
                method: 'POST'
            });

            if (response.ok) {
                // Remove from local state and re-render
                followRequests = followRequests.filter(r => r.username !== username);
                updateNotificationsList();
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    }

    // Update the notifications list in the DOM
    function updateNotificationsList() {
        const notificationsList = document.querySelector('.notifications-list');
        if (notificationsList) {
            notificationsList.innerHTML = generateNotificationItems();
            attachNotificationHandlers();
        }
    }

    // Attach click handlers to notification buttons
    function attachNotificationHandlers() {
        const confirmBtns = document.querySelectorAll('.notif-btn-confirm');
        const deleteBtns = document.querySelectorAll('.notif-btn-delete');

        confirmBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const username = btn.dataset.username;
                handleAcceptRequest(username);
            });
        });

        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const username = btn.dataset.username;
                handleRejectRequest(username);
            });
        });
    }

    // Define Sidebar HTML
    const sidebarHTML = `
        <div class="sidebar">
            <div class="sidebar-header">
                <h1 class="brand-logo">Instagram</h1>
            </div>
            <div class="sidebar-menu">
                <a href="/" class="menu-item" id="nav-home">
                    <i class="fa-solid fa-house"></i>
                    <span>Home</span>
                </a>
                <a href="#" class="menu-item" id="nav-search">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <span>Search</span>
                </a>
                <a href="#" class="menu-item" id="nav-explore">
                    <i class="fa-regular fa-compass"></i>
                    <span>Explore</span>
                </a>
                <a href="#" class="menu-item" id="nav-reels">
                    <i class="fa-solid fa-clapperboard"></i>
                    <span>Reels</span>
                </a>
                <a href="#" class="menu-item" id="nav-notifications">
                    <i class="fa-regular fa-heart"></i>
                    <span>Notifications</span>
                </a>
                <a href="#" class="menu-item" id="nav-create">
                    <i class="fa-regular fa-square-plus"></i>
                    <span>Create</span>
                </a>
            </div>
            <div class="sidebar-footer">
                
                <!-- More Dropdown Menu -->
                <div class="more-options-menu" id="moreOptionsMenu" style="display: none;">
                    <a href="/settings.html" class="more-option-item">
                        <i class="fa-solid fa-gear"></i>
                        <span>Settings</span>
                    </a>
                    <a href="#" class="more-option-item">
                        <i class="fa-solid fa-ban"></i>
                        <span>Blocked accounts</span>
                    </a>
                     <!-- Profile with Picture -->
                    <a href="#" class="more-option-item" id="nav-profile-menu">
                         <div class="profile-icon-menu" style="width: 34px; height: 34px; border-radius: 50%; overflow: hidden; margin-right: 12px; display: flex; align-items: center; justify-content: center;">
                             <!-- Image will be updated by JS -->
                            <img src="${DEFAULT_AVATAR_PATH}" alt="Profile" class="sidebar-profile-pic" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <span>Profile</span>
                    </a>
                    <div class="menu-divider"></div>
                     <a href="#" class="more-option-item" id="logoutBtn">
                        <span style="padding-left: 14px;">Log out</span>
                    </a>
                </div>

                <a href="#" class="menu-item" id="moreBtn">
                    <i class="fa-solid fa-bars"></i>
                    <span>More</span>
                </a>
            </div>
        </div>

        <!-- Notifications Panel -->
        <div class="notifications-panel" id="notificationsPanel">
            <div class="notifications-header">
                <h2>Notifications</h2>
            </div>
            <div class="notifications-section">
                <h4 class="notifications-section-title">Earlier</h4>
                <div class="notifications-list">
                    ${generateNotificationItems()}
                </div>
            </div>
        </div>
    `;

    // Search Panel HTML
    const searchPanelHTML = `
        <div class="search-panel" id="searchPanel">
            <div class="search-header">
                <h2>Search</h2>
                <div class="search-input-container">
                    <div class="search-input-wrapper">
                        <input type="text" id="searchInput" placeholder="Search" autocomplete="off">
                        <button class="search-clear-btn" id="searchClearBtn"><i class="fa-solid fa-circle-xmark"></i></button>
                        <button class="search-trigger-btn" id="searchTriggerBtn"><i class="fa-solid fa-magnifying-glass"></i></button>
                    </div>
                </div>
            </div>
            <div class="search-results-section">
                <div class="search-results-list" id="searchResultsList">
                    <div class="search-empty-state">
                        <span>Recent</span>
                        <div class="no-recent-searches">No recent searches.</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Create Menu Popup HTML
    const createMenuHTML = `
        <div class="create-menu-popup" id="createMenuPopup" style="display: none;">
            <div class="create-menu-item" id="createImageOption">
                <i class="fa-regular fa-images"></i>
                <span>Images</span>
            </div>
            <div class="create-menu-item" id="createReelOption">
                <i class="fa-solid fa-film"></i>
                <span>Reels</span>
            </div>
        </div>
    `;

    // Upload Modal HTML (Multi-step wizard)
    const uploadModalHTML = `
        <div class="upload-modal-overlay" id="uploadModalOverlay">
            <div class="upload-modal">
                <!-- Step 1: Select File -->
                <div class="upload-step" id="uploadStep1">
                    <div class="upload-modal-header">
                        <span class="upload-close-btn" id="uploadCloseBtn">&times;</span>
                        <h3>Create new post</h3>
                        <span class="upload-next-btn disabled" id="uploadNextBtn1">Next</span>
                    </div>
                    <div class="upload-content-area upload-select-area">
                        <i class="fa-regular fa-images upload-icon-large"></i>
                        <h3>Drag photos and videos here</h3>
                        <button class="upload-select-btn" id="uploadSelectBtn">Select from computer</button>
                        <input type="file" id="uploadFileInput" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" style="display: none;">
                    </div>
                </div>

                <!-- Step 2: Crop -->
                <div class="upload-step" id="uploadStep2" style="display: none;">
                    <div class="upload-modal-header">
                        <span class="upload-back-btn" id="uploadBackBtn2"><i class="fa-solid fa-arrow-left"></i></span>
                        <h3>Crop</h3>
                        <span class="upload-next-btn" id="uploadNextBtn2">Next</span>
                    </div>
                    <div class="upload-content-area upload-crop-area">
                        <div class="upload-canvas-container" id="uploadCanvasContainer">
                            <canvas id="uploadCanvas"></canvas>
                        </div>
                        <div class="upload-crop-controls">
                            <div class="crop-ratio-buttons">
                                <button class="ratio-btn" id="ratioBtnCrop" title="Toggle Crop Options">
                                    <i class="fa-solid fa-crop"></i>
                                </button>
                                <button class="ratio-btn" id="ratioZoomBtn" title="Zoom">
                                    <i class="fa-solid fa-magnifying-glass-plus"></i>
                                </button>
                            </div>
                            <div class="ratio-options" id="ratioOptions" style="display: none;">
                                <button class="ratio-option active" data-ratio="1:1">1:1</button>
                                <button class="ratio-option" data-ratio="4:5">4:5</button>
                            </div>
                            <div class="zoom-slider-container" id="zoomSliderContainer" style="display: none;">
                                <input type="range" id="uploadZoomSlider" min="100" max="200" value="100">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 3: Filters -->
                <div class="upload-step" id="uploadStep3" style="display: none;">
                    <div class="upload-modal-header">
                        <span class="upload-back-btn" id="uploadBackBtn3"><i class="fa-solid fa-arrow-left"></i></span>
                        <h3>Edit</h3>
                        <span class="upload-next-btn" id="uploadNextBtn3">Next</span>
                    </div>
                    <div class="upload-content-area upload-filter-area">
                        <div class="upload-preview-container">
                            <canvas id="uploadPreviewCanvas"></canvas>
                        </div>
                        <div class="upload-filters-panel">
                            <div class="filters-header">Filters</div>
                            <div class="filters-grid" id="filtersGrid">
                                <div class="filter-item active" data-filter="none">
                                    <div class="filter-preview" id="filterPreviewNone"></div>
                                    <span>Original</span>
                                </div>
                                <div class="filter-item" data-filter="clarendon">
                                    <div class="filter-preview" id="filterPreviewClarendon"></div>
                                    <span>Clarendon</span>
                                </div>
                                <div class="filter-item" data-filter="gingham">
                                    <div class="filter-preview" id="filterPreviewGingham"></div>
                                    <span>Gingham</span>
                                </div>
                                <div class="filter-item" data-filter="moon">
                                    <div class="filter-preview" id="filterPreviewMoon"></div>
                                    <span>Moon</span>
                                </div>
                                <div class="filter-item" data-filter="lark">
                                    <div class="filter-preview" id="filterPreviewLark"></div>
                                    <span>Lark</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 4: Caption & Tags -->
                <div class="upload-step" id="uploadStep4" style="display: none;">
                    <div class="upload-modal-header">
                        <span class="upload-back-btn" id="uploadBackBtn4"><i class="fa-solid fa-arrow-left"></i></span>
                        <h3>Create new post</h3>
                        <span class="upload-share-btn" id="uploadShareBtn">Share</span>
                    </div>
                    <div class="upload-content-area upload-caption-area">
                        <div class="upload-final-preview">
                            <div class="video-preview-wrapper">
                                <canvas id="uploadFinalCanvas"></canvas>
                                <video id="uploadReelPreview" controls muted style="display: none; max-width: 100%; max-height: 300px;"></video>
                                <!-- Timed overlay message -->
                                <div class="video-message-overlay" id="videoMessageOverlay"></div>
                            </div>
                            <!-- Trim controls moved below video -->
                            <div class="video-trim-controls" id="videoTrimControls" style="display: none;">
                                <div class="trim-header">Trim Video (Max: <span id="maxDurationDisplay">40</span>s)</div>
                                <div class="trim-range-container">
                                    <label>Start: <input type="number" id="trimStartInput" min="0" value="0" step="1">s</label>
                                    <label>End: <input type="number" id="trimEndInput" min="1" value="40" step="1">s</label>
                                </div>
                                <div class="trim-info">Selected duration: <span id="selectedDurationDisplay">40</span>s</div>
                            </div>
                        </div>
                        <div class="upload-form-panel">
                            <div class="upload-user-info">
                                <img src="${DEFAULT_AVATAR_PATH}" alt="User" class="upload-user-avatar">
                                <span class="upload-username">username</span>
                                <span class="upload-verified-badge" id="uploadVerifiedBadge" style="display: none;"></span>
                            </div>
                            <textarea class="upload-caption-input" id="uploadCaptionInput" placeholder="Write a caption..." maxlength="2200"></textarea>
                            <div class="caption-char-count"><span id="captionCharCount">0</span>/2,200</div>
                            <div class="upload-tags-section">
                                <input type="text" class="upload-tags-input" id="uploadTagsInput" placeholder="Insert tags separated by comma">
                                <div class="tags-limit-info">Remaining: <span id="remainingTagsDisplay">3</span> of <span id="maxTagsDisplay">3</span> tags</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Loading State -->
                <div class="upload-step upload-loading-step" id="uploadStepLoading" style="display: none;">
                    <div class="upload-modal-header">
                        <h3>Sharing</h3>
                    </div>
                    <div class="upload-content-area upload-loading-area">
                        <div class="upload-spinner"></div>
                        <p>Uploading your post...</p>
                    </div>
                </div>

                <!-- Success State -->
                <div class="upload-step" id="uploadStepSuccess" style="display: none;">
                    <div class="upload-modal-header">
                        <span class="upload-close-btn">&times;</span>
                        <h3>Post shared</h3>
                    </div>
                    <div class="upload-content-area upload-success-area">
                        <i class="fa-regular fa-circle-check upload-success-icon"></i>
                        <p>Your post has been shared.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Inject Sidebar and Panels
    sidebarContainer.innerHTML = sidebarHTML + searchPanelHTML + createMenuHTML + uploadModalHTML;

    // Highlight Active Link Logic
    const currentPath = window.location.pathname;
    if (currentPath.includes("settings.html")) {
        // Optional: Highlight something if needed, or leave neutral
    } else if (currentPath.includes("index.html") || currentPath === "/") {
        document.getElementById("nav-home").classList.add("active");
    }

    // Toggle More Menu Logic
    const moreBtn = document.getElementById("moreBtn");
    const moreMenu = document.getElementById("moreOptionsMenu");
    const logoutBtn = document.getElementById("logoutBtn");

    // Notifications Panel Logic
    const notificationsBtn = document.getElementById("nav-notifications");
    const notificationsPanel = document.getElementById("notificationsPanel");

    // Search Panel Logic
    const searchBtn = document.getElementById("nav-search");
    const searchPanel = document.getElementById("searchPanel");
    const searchInput = document.getElementById("searchInput");
    const searchClearBtn = document.getElementById("searchClearBtn");
    const searchTriggerBtn = document.getElementById("searchTriggerBtn");
    const searchResultsList = document.getElementById("searchResultsList");

    const sidebar = document.querySelector(".sidebar");

    function closeAllPanels() {
        if (notificationsPanel) notificationsPanel.classList.remove("open");
        if (searchPanel) searchPanel.classList.remove("open");
        sidebar.classList.remove("active-panel"); // Generalized class for resizing sidebar
        sidebar.classList.remove("notifications-active"); // Keep for backward compatibility if needed, or remove
    }

    if (notificationsBtn && notificationsPanel) {
        notificationsBtn.addEventListener("click", async function (e) {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = notificationsPanel.classList.contains("open");

            // Close updated search panel if open
            if (searchPanel) searchPanel.classList.remove("open");

            if (isOpen) {
                closeAllPanels();
            } else {
                // Close more menu if open
                if (moreMenu) moreMenu.style.display = "none";

                notificationsPanel.classList.add("open");
                sidebar.classList.add("active-panel");
                sidebar.classList.add("notifications-active");

                // Fetch notifications when panel opens
                await fetchFollowRequests();
                updateNotificationsList();
            }
        });
    }

    // Search Panel Event Listeners
    if (searchBtn && searchPanel) {
        searchBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = searchPanel.classList.contains("open");

            // Close notification panel if open
            if (notificationsPanel) notificationsPanel.classList.remove("open");

            if (isOpen) {
                closeAllPanels();
            } else {
                if (moreMenu) moreMenu.style.display = "none";
                searchPanel.classList.add("open");
                sidebar.classList.add("active-panel");
                sidebar.classList.add("notifications-active"); // Reuse this style for collapsed sidebar
                if (searchInput) searchInput.focus();
            }
        });

        // Search Input Logic - Manual Trigger
        if (searchInput) {
            searchInput.addEventListener("input", function (e) {
                const query = e.target.value.trim();
                // Toggle clear button
                if (searchClearBtn) {
                    searchClearBtn.style.display = query.length > 0 ? "block" : "none";
                }
            });

            // Enter key trigger
            searchInput.addEventListener("keypress", function (e) {
                if (e.key === "Enter") {
                    const query = searchInput.value.trim();
                    performSearch(query);
                }
            });
        }

        if (searchTriggerBtn) {
            searchTriggerBtn.addEventListener("click", function () {
                const query = searchInput ? searchInput.value.trim() : "";
                performSearch(query);
            });
        }

        if (searchClearBtn) {
            searchClearBtn.addEventListener("click", function () {
                searchInput.value = "";
                searchInput.focus();
                searchClearBtn.style.display = "none";
                document.getElementById("searchResultsList").innerHTML = `
                <div class="search-empty-state">
                    <span>Recent</span>
                    <div class="no-recent-searches">No recent searches.</div>
                </div>`;
            });
        }
    }

    // Close panels when clicking outside
    document.addEventListener("click", function (e) {
        const isClickInsideNotify = notificationsPanel && notificationsPanel.contains(e.target);
        const isClickInsideSearch = searchPanel && searchPanel.contains(e.target);
        const isClickNotifyBtn = notificationsBtn && notificationsBtn.contains(e.target);
        const isClickSearchBtn = searchBtn && searchBtn.contains(e.target);

        if (!isClickInsideNotify && !isClickInsideSearch && !isClickNotifyBtn && !isClickSearchBtn) {
            closeAllPanels();
        }
    });

    async function performSearch(query) {
        if (!searchResultsList) return;

        if (!query) {
            searchResultsList.innerHTML = `
                <div class="search-empty-state">
                    <span>Recent</span>
                    <div class="no-recent-searches">No recent searches.</div>
                </div>`;
            return;
        }

        try {
            // Show loading state if needed
            const response = await fetch(`/api/user/search?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const results = await response.json();
                renderSearchResults(results);
            } else {
                console.error("Search failed");
            }
        } catch (error) {
            console.error("Error searching:", error);
        }
    }

    function renderSearchResults(users) {
        if (users.length === 0) {
            searchResultsList.innerHTML = '<div class="search-no-results">No results found.</div>';
            return;
        }

        const html = users.map(user => `
            <a href="/${user.USERNAME || user.userName}" class="search-result-item">
                <div class="search-avatar">
                    <img src="${user.PROFILE_PICTURE_URL || user.profile_Picture_URL || DEFAULT_AVATAR_PATH}" alt="${user.USERNAME || user.userName}">
                </div>
                <div class="search-user-info">
                    <div class="search-username-row">
                        <span class="search-username">${user.USERNAME || user.userName}</span>
                        ${(user.VERIFICATION_STATUS === 'Verified' || user.verification_Status === 'Verified') ? `
                        <span class="verified-badge-small" title="Verified">
                            <svg aria-label="Verified" class="x1lliihq x1n2onr6" fill="rgb(0, 149, 246)" height="12" role="img" viewBox="0 0 40 40" width="12">
                                <title>Verified</title>
                                <path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fill-rule="evenodd"></path>
                            </svg>
                        </span>` : ''}
                    </div>
                    <span class="search-fullname">${user.PROFILE_NAME || user.profile_Name || ''}</span>
                </div>
            </a>
        `).join('');

        searchResultsList.innerHTML = html;
    }

    if (moreBtn && moreMenu) {
        moreBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            // Close notifications panel if open
            closeAllPanels();
            const isHidden = moreMenu.style.display === "none";
            moreMenu.style.display = isHidden ? "block" : "none";
        });

        // Close menu when clicking outside
        document.addEventListener("click", function (e) {
            if (!moreMenu.contains(e.target) && !moreBtn.contains(e.target)) {
                moreMenu.style.display = "none";
            }
        });
    }

    // Fetch User Data for Sidebar Profile Pic
    fetch('/api/auth/me')
        .then(res => {
            if (res.ok) return res.json();
            if (res.status === 401) {
                // Not authenticated, redirect to login
                window.location.href = '/login.html';
                throw new Error('Redirecting to login');
            }
            throw new Error('Not authenticated');
        })
        .then(user => {
            if (user && user.profilePictureUrl) {
                const profilePics = document.querySelectorAll('.sidebar-profile-pic');
                profilePics.forEach(img => {
                    img.src = user.profilePictureUrl;
                });
            }
            // Set profile link to user's profile page
            if (user && user.username) {
                const profileLink = document.getElementById('nav-profile-menu');
                if (profileLink) {
                    profileLink.href = `/${user.username.trim()}`;
                }
            }
        })
        .catch(err => {
            // Check if we are already redirected or if it's a network error that warrants a redirect
            if (err.message !== 'Redirecting to login') {
                console.error("Sidebar auth check failed", err);
                // Optional: Force login on error too? safer for protected routes.
                window.location.href = '/login.html';
            }
        });

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async function (e) {
            e.preventDefault();
            try {
                const response = await fetch('/api/auth/logout', { method: 'POST' });
                if (response.ok) {
                    window.location.href = '/login.html';
                } else {
                    console.error('Logout failed');
                }
            } catch (error) {
                console.error('Error logging out:', error);
            }
        });
    }

    // ========================================
    // CREATE MENU & UPLOAD MODAL FUNCTIONALITY
    // ========================================

    const createBtn = document.getElementById("nav-create");
    const createMenuPopup = document.getElementById("createMenuPopup");
    const createImageOption = document.getElementById("createImageOption");
    const createReelOption = document.getElementById("createReelOption");
    const uploadModalOverlay = document.getElementById("uploadModalOverlay");

    // Upload state
    let uploadState = {
        file: null,
        fileType: 'image', // 'image' or 'reel'
        originalImage: null,
        currentStep: 1,
        aspectRatio: '1:1',
        zoom: 100,
        panX: 0,  // Pan offset X for image positioning
        panY: 0,  // Pan offset Y for image positioning
        currentFilter: 'none',
        maxTags: 3,
        isVerified: false,
        maxReelDuration: REEL_DURATION_NORMAL,
        reelDuration: 0,
        reelStartTime: 0,  // For video trimming
        reelEndTime: REEL_DURATION_NORMAL,   // For video trimming
        username: '',
        profilePicUrl: DEFAULT_AVATAR_PATH
    };

    // Filter definitions (simplified set)
    const uploadFilters = {
        'none': 'none',
        'clarendon': 'contrast(120%) saturate(125%)',
        'gingham': 'sepia(6%) brightness(105%) hue-rotate(-10deg)',
        'moon': 'grayscale(100%) contrast(110%)',
        'lark': 'brightness(110%) saturate(110%) contrast(90%)'
    };

    // Show video message overlay (auto-hides after 3 seconds)
    function showVideoMessage(message) {
        const overlay = document.getElementById('videoMessageOverlay');
        if (overlay) {
            overlay.textContent = message;
            overlay.classList.add('visible');
            setTimeout(() => {
                overlay.classList.remove('visible');
            }, 3000);
        }
    }

    // Create Menu Toggle
    if (createBtn && createMenuPopup) {
        createBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            closeAllPanels();
            if (moreMenu) moreMenu.style.display = "none";

            const isVisible = createMenuPopup.style.display !== "none";
            createMenuPopup.style.display = isVisible ? "none" : "flex";
        });

        // Close menu when clicking outside
        document.addEventListener("click", function (e) {
            if (createMenuPopup && !createMenuPopup.contains(e.target) && !createBtn.contains(e.target)) {
                createMenuPopup.style.display = "none";
            }
        });
    }

    // Open upload modal for images
    if (createImageOption) {
        createImageOption.addEventListener("click", function () {
            uploadState.fileType = 'image';
            createMenuPopup.style.display = "none";
            // Set accept to only images
            const fileInput = document.getElementById('uploadFileInput');
            if (fileInput) fileInput.accept = 'image/jpeg,image/png,image/webp';
            openUploadModal();
        });
    }

    // Open upload modal for reels
    if (createReelOption) {
        createReelOption.addEventListener("click", function () {
            uploadState.fileType = 'reel';
            createMenuPopup.style.display = "none";
            // Set accept to only videos
            const fileInput = document.getElementById('uploadFileInput');
            if (fileInput) fileInput.accept = 'video/mp4,video/quicktime,video/webm';
            openUploadModal();
        });
    }

    // Open Upload Modal
    function openUploadModal() {
        if (!uploadModalOverlay) return;

        // Fetch upload limits
        fetch('/api/content/limits')
            .then(res => res.json())
            .then(data => {
                uploadState.maxTags = data.maxTags || 3;
                uploadState.isVerified = data.isVerified || false;
                uploadState.maxReelDuration = data.maxReelDuration || REEL_DURATION_NORMAL;

                const maxTagsDisplay = document.getElementById("maxTagsDisplay");
                const remainingTagsDisplay = document.getElementById("remainingTagsDisplay");
                if (maxTagsDisplay) maxTagsDisplay.textContent = uploadState.maxTags;
                if (remainingTagsDisplay) remainingTagsDisplay.textContent = uploadState.maxTags;

                // Show verified badge if user is verified
                const verifiedBadge = document.getElementById("uploadVerifiedBadge");
                if (verifiedBadge) {
                    if (uploadState.isVerified) {
                        verifiedBadge.innerHTML = '<svg aria-label="Verified" fill="#0095f6" height="18" viewBox="0 0 40 40" width="18"><path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fill-rule="evenodd"></path></svg>';
                        verifiedBadge.style.display = 'inline-flex';
                    } else {
                        verifiedBadge.style.display = 'none';
                    }
                }
            })
            .catch(err => console.error('Error fetching limits:', err));

        // Fetch user info
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(user => {
                uploadState.username = user.username || '';
                uploadState.profilePicUrl = user.profilePictureUrl || DEFAULT_AVATAR_PATH;

                const uploadUsername = document.querySelector('.upload-username');
                const uploadAvatar = document.querySelector('.upload-user-avatar');
                if (uploadUsername) uploadUsername.textContent = user.username;
                if (uploadAvatar) uploadAvatar.src = uploadState.profilePicUrl;
            })
            .catch(err => console.error('Error fetching user:', err));

        resetUploadModal();
        uploadModalOverlay.style.display = "flex";
        document.body.style.overflow = "hidden";
    }

    // Close Upload Modal
    function closeUploadModal() {
        if (!uploadModalOverlay) return;
        uploadModalOverlay.style.display = "none";
        document.body.style.overflow = "";
        resetUploadModal();
    }

    // Reset modal to initial state
    function resetUploadModal() {
        uploadState.file = null;
        uploadState.originalImage = null;
        uploadState.currentStep = 1;
        uploadState.aspectRatio = '1:1';
        uploadState.zoom = 100;
        uploadState.panX = 0;
        uploadState.panY = 0;
        uploadState.currentFilter = 'none';
        uploadState.reelStartTime = 0;
        uploadState.reelEndTime = 60;

        // Show step 1, hide others
        document.querySelectorAll('.upload-step').forEach(step => step.style.display = 'none');
        const step1 = document.getElementById('uploadStep1');
        if (step1) step1.style.display = 'block';

        // Reset inputs
        const fileInput = document.getElementById('uploadFileInput');
        const captionInput = document.getElementById('uploadCaptionInput');
        const tagsInput = document.getElementById('uploadTagsInput');
        const charCount = document.getElementById('captionCharCount');
        const trimControls = document.getElementById('videoTrimControls');

        if (fileInput) fileInput.value = '';
        if (captionInput) captionInput.value = '';
        if (tagsInput) tagsInput.value = '';
        if (charCount) charCount.textContent = '0';
        if (trimControls) trimControls.style.display = 'none';
    }

    // Close button handlers
    document.querySelectorAll('.upload-close-btn').forEach(btn => {
        btn.addEventListener('click', closeUploadModal);
    });

    // Close on overlay click
    if (uploadModalOverlay) {
        uploadModalOverlay.addEventListener('click', function (e) {
            if (e.target === uploadModalOverlay) {
                closeUploadModal();
            }
        });
    }

    // File Select Button
    const uploadSelectBtn = document.getElementById('uploadSelectBtn');
    const uploadFileInput = document.getElementById('uploadFileInput');

    if (uploadSelectBtn && uploadFileInput) {
        uploadSelectBtn.addEventListener('click', () => uploadFileInput.click());
    }

    // File Input Change
    if (uploadFileInput) {
        uploadFileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            uploadState.file = file;

            // Check if it's a video (reel)
            if (file.type.startsWith('video/')) {
                uploadState.fileType = 'reel';

                // Create video preview URL
                const videoUrl = URL.createObjectURL(file);
                const videoPreview = document.getElementById('uploadReelPreview');
                const canvasPreview = document.getElementById('uploadFinalCanvas');

                if (videoPreview) {
                    videoPreview.src = videoUrl;
                    videoPreview.style.display = 'block';
                    if (canvasPreview) canvasPreview.style.display = 'none';

                    // Get video duration once metadata is loaded
                    videoPreview.onloadedmetadata = function () {
                        uploadState.reelDuration = Math.round(videoPreview.duration);
                        const maxDuration = uploadState.isVerified ? REEL_DURATION_VERIFIED : REEL_DURATION_NORMAL;

                        // Set up trim controls
                        const trimControls = document.getElementById('videoTrimControls');
                        const maxDurationDisplay = document.getElementById('maxDurationDisplay');
                        const trimStartInput = document.getElementById('trimStartInput');
                        const trimEndInput = document.getElementById('trimEndInput');
                        const selectedDurationDisplay = document.getElementById('selectedDurationDisplay');

                        if (trimControls) trimControls.style.display = 'block';
                        if (maxDurationDisplay) maxDurationDisplay.textContent = maxDuration;

                        // Set initial trim values
                        uploadState.reelStartTime = 0;
                        uploadState.reelEndTime = Math.min(uploadState.reelDuration, maxDuration);

                        if (trimStartInput) {
                            trimStartInput.value = 0;
                            trimStartInput.max = uploadState.reelDuration - 1;
                        }
                        if (trimEndInput) {
                            trimEndInput.value = uploadState.reelEndTime;
                            trimEndInput.max = uploadState.reelDuration;
                        }
                        if (selectedDurationDisplay) {
                            selectedDurationDisplay.textContent = uploadState.reelEndTime - uploadState.reelStartTime;
                        }

                        // If video is longer than max, show message overlay instead of alert
                        if (uploadState.reelDuration > maxDuration) {
                            showVideoMessage(`Video is ${uploadState.reelDuration}s. It will be trimmed to the first ${maxDuration}s. Use trim controls below to select a different portion.`);
                        }
                    };
                }

                showStep(4);
                return;
            }

            // For images, load into canvas
            const reader = new FileReader();
            reader.onload = function (event) {
                uploadState.originalImage = new Image();
                uploadState.originalImage.onload = function () {
                    showStep(2);
                    drawUploadCanvas();
                };
                uploadState.originalImage.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Show specific step
    function showStep(stepNum) {
        uploadState.currentStep = stepNum;
        document.querySelectorAll('.upload-step').forEach(step => step.style.display = 'none');

        const stepEl = document.getElementById(`uploadStep${stepNum}`);
        if (stepEl) stepEl.style.display = 'block';

        // Special handling for step transitions
        if (stepNum === 3) {
            drawPreviewCanvas();
            generateFilterPreviews();
        } else if (stepNum === 4) {
            // Show appropriate preview for image or reel
            const canvas = document.getElementById('uploadFinalCanvas');
            const videoPreview = document.getElementById('uploadReelPreview');

            if (uploadState.fileType === 'reel') {
                if (canvas) canvas.style.display = 'none';
                if (videoPreview) videoPreview.style.display = 'block';
            } else {
                if (videoPreview) videoPreview.style.display = 'none';
                if (canvas) canvas.style.display = 'block';
                drawFinalCanvas();
            }
        }
    }

    // Navigation handlers
    document.getElementById('uploadBackBtn2')?.addEventListener('click', () => showStep(1));
    document.getElementById('uploadBackBtn3')?.addEventListener('click', () => showStep(2));
    document.getElementById('uploadBackBtn4')?.addEventListener('click', () => {
        if (uploadState.fileType === 'reel') {
            showStep(1);
        } else {
            showStep(3);
        }
    });

    document.getElementById('uploadNextBtn2')?.addEventListener('click', () => showStep(3));
    document.getElementById('uploadNextBtn3')?.addEventListener('click', () => showStep(4));

    // Draw upload canvas (Step 2 - Crop)
    function drawUploadCanvas() {
        const canvas = document.getElementById('uploadCanvas');
        const container = document.getElementById('uploadCanvasContainer');
        if (!canvas || !container || !uploadState.originalImage) return;

        const ctx = canvas.getContext('2d');
        const img = uploadState.originalImage;

        // Set canvas to full container size to show outside area
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        // Calculate Crop Box Dimensions
        // We want the crop box to fit within the container with some padding, respecting aspect ratio
        let targetRatio = uploadState.aspectRatio === '1:1' ? 1 : 4 / 5;

        // Find max available bounds for crop box (leaving space for toolbar if needed, though canvas overlays it?)
        // The original code used (clientHeight - 60). Let's stick to safe padding.
        const padding = 20;
        const availableW = canvas.width - (padding * 2);
        const availableH = canvas.height - (padding * 2);

        let cropW, cropH;

        if (availableW / availableH > targetRatio) {
            // Container is wider than needed, height is limiting factor
            cropH = availableH;
            cropW = cropH * targetRatio;
        } else {
            // Container is taller than needed, width is limiting factor
            cropW = availableW;
            cropH = cropW / targetRatio;
        }

        // Center the crop box
        const cropX = (canvas.width - cropW) / 2;
        const cropY = (canvas.height - cropH) / 2;

        // Calculate scaled image dimensions relative to Crop Box
        const scale = uploadState.zoom / 100;
        const imgRatio = img.width / img.height;

        let drawW, drawH;
        if (imgRatio > targetRatio) {
            drawH = cropH * scale;
            drawW = drawH * imgRatio;
        } else {
            drawW = cropW * scale;
            drawH = drawW / imgRatio;
        }

        // Store crop dimensions for later scaling
        uploadState.cropCanvasW = cropW;
        uploadState.cropCanvasH = cropH;

        // Calculate image position: Start from Crop Center + (Difference in sizes)/2 + Pan
        // Basically centering the image within the Crop Box, then applying Pan
        const drawX = cropX + (cropW - drawW) / 2 + uploadState.panX;
        const drawY = cropY + (cropH - cropH * (drawH / cropH)) / 2 + uploadState.panY;
        // Wait, the vertical centering logic above was simplified.
        // Correct logic: Center of Image aligns with Center of Crop Box + Pan.
        // Image Center X = drawX + drawW/2
        // Crop Center X = cropX + cropW/2
        // We want: Image Center X = Crop Center X + PanX
        // drawX + drawW/2 = cropX + cropW/2 + PanX.
        // This matches my formula.

        // Correct Y formula:
        const drawYClean = cropY + (cropH - drawH) / 2 + uploadState.panY;


        // 1. Clear Canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 2. Draw Full Image (Normal Opacity? User said "Area that will be posted shown normal, other area reduced opacity")
        // So we draw the image fully header, then overlay the "dim" mask outside the crop box.
        ctx.drawImage(img, drawX, drawYClean, drawW, drawH);

        // 3. Draw Dimmed Overlay (Mask)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

        // Top rect
        ctx.fillRect(0, 0, canvas.width, cropY);
        // Bottom rect
        ctx.fillRect(0, cropY + cropH, canvas.width, canvas.height - (cropY + cropH));
        // Left rect
        ctx.fillRect(0, cropY, cropX, cropH);
        // Right rect
        ctx.fillRect(cropX + cropW, cropY, canvas.width - (cropX + cropW), cropH);

        // 4. Draw Border around Crop Box
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cropX, cropY, cropW, cropH);

        // 5. Draw Grid Lines (Rule of Thirds) - Optional but nice
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        // Vertical
        ctx.moveTo(cropX + cropW / 3, cropY);
        ctx.lineTo(cropX + cropW / 3, cropY + cropH);
        ctx.moveTo(cropX + 2 * cropW / 3, cropY);
        ctx.lineTo(cropX + 2 * cropW / 3, cropY + cropH);
        // Horizontal
        ctx.moveTo(cropX, cropY + cropH / 3);
        ctx.lineTo(cropX + cropW, cropY + cropH / 3);
        ctx.moveTo(cropX, cropY + 2 * cropH / 3);
        ctx.lineTo(cropX + cropW, cropY + 2 * cropH / 3);
        ctx.stroke();
    }

    // Canvas drag/pan functionality for image positioning
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartPanX = 0;
    let dragStartPanY = 0;

    const uploadCanvasEl = document.getElementById('uploadCanvas');
    if (uploadCanvasEl) {
        uploadCanvasEl.style.cursor = 'grab';

        uploadCanvasEl.addEventListener('mousedown', function (e) {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            dragStartPanX = uploadState.panX;
            dragStartPanY = uploadState.panY;
            this.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;

            const deltaX = e.clientX - dragStartX;
            const deltaY = e.clientY - dragStartY;

            uploadState.panX = dragStartPanX + deltaX;
            uploadState.panY = dragStartPanY + deltaY;

            drawUploadCanvas();
        });

        document.addEventListener('mouseup', function () {
            if (isDragging) {
                isDragging = false;
                if (uploadCanvasEl) uploadCanvasEl.style.cursor = 'grab';
            }
        });

        // Touch support for mobile
        uploadCanvasEl.addEventListener('touchstart', function (e) {
            if (e.touches.length === 1) {
                isDragging = true;
                dragStartX = e.touches[0].clientX;
                dragStartY = e.touches[0].clientY;
                dragStartPanX = uploadState.panX;
                dragStartPanY = uploadState.panY;
                e.preventDefault();
            }
        });

        document.addEventListener('touchmove', function (e) {
            if (!isDragging || e.touches.length !== 1) return;

            const deltaX = e.touches[0].clientX - dragStartX;
            const deltaY = e.touches[0].clientY - dragStartY;

            uploadState.panX = dragStartPanX + deltaX;
            uploadState.panY = dragStartPanY + deltaY;

            drawUploadCanvas();
        });

        document.addEventListener('touchend', function () {
            isDragging = false;
        });
    }

    // Crop ratio buttons
    const ratioBtnCrop = document.getElementById('ratioBtnCrop');
    const ratioOptions = document.getElementById('ratioOptions');
    const ratioZoomBtn = document.getElementById('ratioZoomBtn');
    const zoomSliderContainer = document.getElementById('zoomSliderContainer');

    if (ratioBtnCrop && ratioOptions) {
        ratioBtnCrop.addEventListener('click', () => {
            ratioOptions.style.display = ratioOptions.style.display === 'none' ? 'flex' : 'none';
            if (zoomSliderContainer) zoomSliderContainer.style.display = 'none';
        });
    }

    if (ratioZoomBtn && zoomSliderContainer) {
        ratioZoomBtn.addEventListener('click', () => {
            zoomSliderContainer.style.display = zoomSliderContainer.style.display === 'none' ? 'block' : 'none';
            if (ratioOptions) ratioOptions.style.display = 'none';
        });
    }

    // Ratio option clicks
    document.querySelectorAll('.ratio-option').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.ratio-option').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            uploadState.aspectRatio = this.dataset.ratio;
            drawUploadCanvas();
        });
    });

    // Zoom slider
    const uploadZoomSlider = document.getElementById('uploadZoomSlider');
    if (uploadZoomSlider) {
        uploadZoomSlider.addEventListener('input', function () {
            uploadState.zoom = parseInt(this.value);
            drawUploadCanvas();
        });
    }

    // Draw preview canvas (Step 3 - Filters)
    function drawPreviewCanvas() {
        const canvas = document.getElementById('uploadPreviewCanvas');
        if (!canvas || !uploadState.originalImage) return;

        const ctx = canvas.getContext('2d');
        const img = uploadState.originalImage;

        // Match aspect ratio from crop step
        let targetRatio = uploadState.aspectRatio === '1:1' ? 1 : 4 / 5;
        canvas.width = 400;
        canvas.height = 400 / targetRatio;

        const imgRatio = img.width / img.height;
        const scale = uploadState.zoom / 100;

        let drawW, drawH;
        if (imgRatio > targetRatio) {
            drawH = canvas.height * scale;
            drawW = drawH * imgRatio;
        } else {
            drawW = canvas.width * scale;
            drawH = drawW / imgRatio;
        }

        // Scale pan offsets from crop canvas size to preview canvas size
        const cropCanvasSize = uploadState.cropCanvasW || 400; // Use actual crop canvas size
        const panScaleX = canvas.width / cropCanvasSize;
        const panScaleY = canvas.height / (cropCanvasSize / targetRatio);

        const drawX = (canvas.width - drawW) / 2 + (uploadState.panX * panScaleX);
        const drawY = (canvas.height - drawH) / 2 + (uploadState.panY * panScaleY);

        ctx.filter = uploadFilters[uploadState.currentFilter] || 'none';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.filter = 'none';
    }

    // Generate filter previews
    function generateFilterPreviews() {
        if (!uploadState.originalImage) return;

        Object.keys(uploadFilters).forEach(filterName => {
            const previewEl = document.getElementById(`filterPreview${filterName.charAt(0).toUpperCase() + filterName.slice(1)}`);
            if (previewEl) {
                const canvas = document.createElement('canvas');
                canvas.width = 100;
                canvas.height = 100;
                const ctx = canvas.getContext('2d');

                ctx.filter = uploadFilters[filterName];
                ctx.drawImage(uploadState.originalImage, 0, 0, 100, 100);

                previewEl.style.backgroundImage = `url(${canvas.toDataURL()})`;
                previewEl.style.backgroundSize = 'cover';
            }
        });
    }

    // Filter clicks
    document.querySelectorAll('.filter-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('.filter-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            uploadState.currentFilter = this.dataset.filter;
            drawPreviewCanvas();
        });
    });

    // Draw final canvas (Step 4)
    function drawFinalCanvas() {
        const canvas = document.getElementById('uploadFinalCanvas');
        if (!canvas || !uploadState.originalImage) return;

        const ctx = canvas.getContext('2d');
        const img = uploadState.originalImage;

        let targetRatio = uploadState.aspectRatio === '1:1' ? 1 : 4 / 5;
        canvas.width = 300;
        canvas.height = 300 / targetRatio;

        const imgRatio = img.width / img.height;
        const scale = uploadState.zoom / 100;

        let drawW, drawH;
        if (imgRatio > targetRatio) {
            drawH = canvas.height * scale;
            drawW = drawH * imgRatio;
        } else {
            drawW = canvas.width * scale;
            drawH = drawW / imgRatio;
        }

        // Scale pan offsets from crop canvas size to final canvas size
        const cropCanvasSize = uploadState.cropCanvasW || 400;
        const panScaleX = canvas.width / cropCanvasSize;
        const panScaleY = canvas.height / (cropCanvasSize / targetRatio);

        const drawX = (canvas.width - drawW) / 2 + (uploadState.panX * panScaleX);
        const drawY = (canvas.height - drawH) / 2 + (uploadState.panY * panScaleY);

        ctx.filter = uploadFilters[uploadState.currentFilter] || 'none';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.filter = 'none';
    }

    // Video trim input handlers
    const trimStartInput = document.getElementById('trimStartInput');
    const trimEndInput = document.getElementById('trimEndInput');
    const selectedDurationDisplay = document.getElementById('selectedDurationDisplay');

    function updateTrimValues() {
        const maxDuration = uploadState.isVerified ? REEL_DURATION_VERIFIED : REEL_DURATION_NORMAL;
        const start = parseInt(trimStartInput?.value) || 0;
        const end = parseInt(trimEndInput?.value) || maxDuration;

        // Validate: end must be after start
        if (end <= start) {
            trimEndInput.value = start + 1;
            return;
        }

        // Validate: duration must not exceed max
        const duration = end - start;
        if (duration > maxDuration) {
            trimEndInput.value = start + maxDuration;
            updateTrimValues();
            return;
        }

        uploadState.reelStartTime = start;
        uploadState.reelEndTime = end;

        if (selectedDurationDisplay) {
            selectedDurationDisplay.textContent = end - start;
        }

        // Seek video to start time for preview
        const videoPreview = document.getElementById('uploadReelPreview');
        if (videoPreview) {
            videoPreview.currentTime = start;
        }
    }

    if (trimStartInput) {
        trimStartInput.addEventListener('change', updateTrimValues);
        trimStartInput.addEventListener('input', updateTrimValues);
    }

    if (trimEndInput) {
        trimEndInput.addEventListener('change', updateTrimValues);
        trimEndInput.addEventListener('input', updateTrimValues);
    }

    // Caption character count
    const captionInput = document.getElementById('uploadCaptionInput');
    const charCount = document.getElementById('captionCharCount');
    if (captionInput && charCount) {
        captionInput.addEventListener('input', function () {
            charCount.textContent = this.value.length;
        });
    }

    // Tag input validation and limit enforcement
    const tagsInput = document.getElementById('uploadTagsInput');
    const remainingTagsDisplay = document.getElementById('remainingTagsDisplay');
    const maxTagsDisplayEl = document.getElementById('maxTagsDisplay');

    function updateTagCount() {
        if (!tagsInput || !remainingTagsDisplay) return;

        const tagsValue = tagsInput.value;
        const tags = tagsValue.split(',').map(t => t.trim()).filter(t => t);
        const remaining = Math.max(0, uploadState.maxTags - tags.length);

        remainingTagsDisplay.textContent = remaining;

        // Visual feedback when limit reached
        if (remaining === 0) {
            remainingTagsDisplay.style.color = '#ed4956';
        } else {
            remainingTagsDisplay.style.color = '';
        }
    }

    if (tagsInput) {
        tagsInput.addEventListener('input', function () {
            const tagsValue = this.value;
            const tags = tagsValue.split(',').map(t => t.trim()).filter(t => t);

            // If over limit, remove the excess tags
            if (tags.length > uploadState.maxTags) {
                // Keep only the allowed number of tags
                const allowedTags = tags.slice(0, uploadState.maxTags);
                this.value = allowedTags.join(', ');
            }

            updateTagCount();
        });

        // Also handle paste events
        tagsInput.addEventListener('paste', function (e) {
            setTimeout(() => {
                const tagsValue = this.value;
                const tags = tagsValue.split(',').map(t => t.trim()).filter(t => t);

                if (tags.length > uploadState.maxTags) {
                    const allowedTags = tags.slice(0, uploadState.maxTags);
                    this.value = allowedTags.join(', ');
                }

                updateTagCount();
            }, 0);
        });
    }

    // Share/Upload button
    const uploadShareBtn = document.getElementById('uploadShareBtn');
    if (uploadShareBtn) {
        uploadShareBtn.addEventListener('click', async function () {
            const caption = document.getElementById('uploadCaptionInput')?.value || '';
            const tagsValue = document.getElementById('uploadTagsInput')?.value || '';
            const tags = tagsValue.split(',').map(t => t.trim()).filter(t => t).slice(0, uploadState.maxTags);

            // Show loading
            showStep('Loading');
            document.getElementById('uploadStepLoading').style.display = 'block';

            try {
                const formData = new FormData();
                formData.append('caption', caption);
                formData.append('tags', tags.join(','));

                if (uploadState.fileType === 'reel') {
                    formData.append('reel', uploadState.file);
                    // Send trimmed duration (end - start), not full video duration
                    const trimmedDuration = uploadState.reelEndTime - uploadState.reelStartTime;
                    formData.append('duration', trimmedDuration || uploadState.reelDuration || '0');

                    const response = await fetch('/api/content/upload-reel', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        const err = await response.json().catch(() => ({}));
                        throw new Error(err.error || 'Upload failed');
                    }
                } else {
                    // Create blob from canvas
                    const finalCanvas = document.getElementById('uploadPreviewCanvas');
                    const blob = await new Promise(resolve => {
                        finalCanvas.toBlob(resolve, 'image/png', 0.95);
                    });

                    formData.append('image', blob, 'post.png');

                    const response = await fetch('/api/content/upload-image', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        const err = await response.json().catch(() => ({}));
                        throw new Error(err.error || 'Upload failed');
                    }
                }

                // Show success
                document.getElementById('uploadStepLoading').style.display = 'none';
                document.getElementById('uploadStepSuccess').style.display = 'block';

                // Auto close after 2 seconds
                setTimeout(() => {
                    closeUploadModal();
                }, 2000);

            } catch (error) {
                console.error('Upload error:', error);
                alert('Failed to upload. Please try again.');
                showStep(4);
            }
        });
    }
});

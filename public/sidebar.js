
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
                <a href="index.html" class="menu-item" id="nav-home">
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
                    <a href="settings.html" class="more-option-item">
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
                            <img src="/uploads/default/default-avatar.png" alt="Profile" class="sidebar-profile-pic" style="width: 100%; height: 100%; object-fit: cover;">
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

    // Inject Sidebar and Panels
    sidebarContainer.innerHTML = sidebarHTML + searchPanelHTML;

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
                    <img src="${user.PROFILE_PICTURE_URL || user.profile_Picture_URL || '/uploads/default/default-avatar.png'}" alt="${user.USERNAME || user.userName}">
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

    // Logout Functionality
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
});

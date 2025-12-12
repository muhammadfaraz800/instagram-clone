
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
                        <span class="notif-username">${request.username}</span>
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

    // Inject Sidebar
    sidebarContainer.innerHTML = sidebarHTML;

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
    const sidebar = document.querySelector(".sidebar");

    if (notificationsBtn && notificationsPanel) {
        notificationsBtn.addEventListener("click", async function (e) {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = notificationsPanel.classList.contains("open");

            if (isOpen) {
                notificationsPanel.classList.remove("open");
                sidebar.classList.remove("notifications-active");
            } else {
                // Close more menu if open
                if (moreMenu) moreMenu.style.display = "none";
                notificationsPanel.classList.add("open");
                sidebar.classList.add("notifications-active");

                // Fetch notifications when panel opens
                await fetchFollowRequests();
                updateNotificationsList();
            }
        });

        // Close notifications panel when clicking outside
        document.addEventListener("click", function (e) {
            if (!notificationsPanel.contains(e.target) &&
                !notificationsBtn.contains(e.target) &&
                notificationsPanel.classList.contains("open")) {
                notificationsPanel.classList.remove("open");
                sidebar.classList.remove("notifications-active");
            }
        });
    }

    if (moreBtn && moreMenu) {
        moreBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            // Close notifications panel if open
            if (notificationsPanel) {
                notificationsPanel.classList.remove("open");
                sidebar.classList.remove("notifications-active");
            }
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
                    profileLink.href = `/${user.username}`;
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

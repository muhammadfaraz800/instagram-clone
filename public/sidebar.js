
document.addEventListener("DOMContentLoaded", function () {
    const sidebarContainer = document.getElementById("sidebar-container");
    if (!sidebarContainer) return;

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
                    <a href="settings.html" class="more-option-item" id="nav-profile-menu">
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

    if (moreBtn && moreMenu) {
        moreBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent closing immediately
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

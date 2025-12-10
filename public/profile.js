/**
 * Profile Page JavaScript
 * Handles profile data loading, follow/unfollow, and tab switching
 */

document.addEventListener('DOMContentLoaded', async function () {
    // ---------- DOM Elements ----------
    const profilePicture = document.getElementById('profile-picture');
    const profileUsername = document.getElementById('profile-username');
    const profileName = document.getElementById('profile-name');
    const businessType = document.getElementById('business-type');
    const profileBio = document.getElementById('profile-bio');
    const profileWebsite = document.getElementById('profile-website');
    const postsCount = document.getElementById('posts-count');
    const followersCount = document.getElementById('followers-count');
    const followingCount = document.getElementById('following-count');
    const profileActions = document.getElementById('profile-actions');
    const postsGrid = document.getElementById('posts-grid');
    const emptyState = document.getElementById('empty-state');
    const privateMessage = document.getElementById('private-message');
    const tabPosts = document.getElementById('tab-posts');
    const tabReels = document.getElementById('tab-reels');
    const unfollowModal = document.getElementById('unfollow-modal');
    const unfollowModalPicture = document.getElementById('unfollow-modal-picture');
    const unfollowModalUsername = document.getElementById('unfollow-modal-username');
    const unfollowModalClose = document.getElementById('unfollow-modal-close');
    const unfollowConfirmBtn = document.getElementById('unfollow-confirm-btn');

    // ---------- State ----------
    let currentUser = null;      // Logged-in user
    let profileUser = null;      // Profile being viewed
    let isOwnProfile = false;
    let isFollowing = false;
    let currentTab = 'posts';

    // ---------- Get Username from URL ----------
    function getUsernameFromUrl() {
        const path = window.location.pathname;
        const parts = path.split('/').filter(Boolean);
        if (parts.length >= 1) {
            // Check if last part is 'reels'
            if (parts[parts.length - 1] === 'reels') {
                currentTab = 'reels';
                return parts[parts.length - 2] || parts[0];
            }
            return parts[0];
        }
        return null;
    }

    // ---------- Fetch Current User ---------- /api/auth/me
    async function fetchCurrentUser() {
        try {
            const response = await fetch('/api/auth/me');
            if (!response.ok) {
                throw new Error('Not authenticated');
            }
            return await response.json();
        } catch (error) {
            console.error('Auth error:', error);
            window.location.href = '/login.html';
            return null;
        }
    }

    // ---------- Fetch Profile Data ---------- /api/profile/${username}
    async function fetchProfileData(username) {
        try {
            const response = await fetch(`/api/profile/${username}`);
            if (!response.ok) {
                if (response.status === 404) {
                    // User not found - redirect to home
                    window.location.href = '/index.html';
                    return null;
                }
                throw new Error('Failed to fetch profile');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
    }

    // ---------- Fetch Follow Status ---------- /api/profile/${username}/follow-status
    async function fetchFollowStatus(username) {
        try {
            const response = await fetch(`/api/profile/${username}/follow-status`);
            if (!response.ok) return false;
            const data = await response.json();
            return data.isFollowing;
        } catch (error) {
            console.error('Error fetching follow status:', error);
            return false;
        }
    }

    // ---------- Fetch Posts ----------
    async function fetchPosts(username, type = 'all') {
        try {
            const response = await fetch(`/api/profile/${username}/posts?type=${type}`);
            if (!response.ok) {
                return [];
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching posts:', error);
            return [];
        }
    }

    // ---------- Render Profile Header ----------
    function renderProfileHeader() {
        if (!profileUser) return;

        // Profile Picture
        profilePicture.src = profileUser.profilePictureUrl || '/uploads/default/default-avatar.png';

        // Username
        profileUsername.textContent = profileUser.username;
        document.title = `${profileUser.username} - Instagram`;

        // Profile Name
        if (profileUser.profileName) {
            profileName.textContent = profileUser.profileName;
            profileName.style.display = 'block';
        } else {
            profileName.style.display = 'none';
        }

        // Business Type (only for business accounts)
        if (profileUser.businessType) {
            businessType.textContent = profileUser.businessType;
            businessType.style.display = 'block';
        } else {
            businessType.style.display = 'none';
        }

        // Bio
        if (profileUser.bio) {
            profileBio.textContent = profileUser.bio;
            profileBio.style.display = 'block';
        } else {
            profileBio.style.display = 'none';
        }

        // Website (only for business accounts)
        if (profileUser.website) {
            let displayUrl = profileUser.website;
            if (!displayUrl.startsWith('http')) {
                displayUrl = 'https://' + displayUrl;
            }
            profileWebsite.href = displayUrl;
            profileWebsite.textContent = profileUser.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
            profileWebsite.style.display = 'block';
        } else {
            profileWebsite.style.display = 'none';
        }

        // Stats
        postsCount.textContent = formatNumber(profileUser.postsCount || 0);
        followersCount.textContent = formatNumber(profileUser.followersCount || 0);
        followingCount.textContent = formatNumber(profileUser.followingCount || 0);
    }

    // ---------- Render Action Buttons ----------
    // ---------- Render Action Buttons ----------
    function renderActionButtons() {
        const profileActions = document.getElementById('profile-actions'); // Header actions
        const profileBioActions = document.getElementById('profile-bio-actions'); // Bio actions (below)

        // Clear both
        if (profileActions) profileActions.innerHTML = '';
        if (profileBioActions) profileBioActions.innerHTML = '';

        if (isOwnProfile) {
            // Own profile - show Edit Profile button in header (next to username)
            const editBtn = document.createElement('a');
            editBtn.href = 'settings.html';
            editBtn.className = 'edit-profile-btn';
            editBtn.textContent = 'Edit profile';
            profileActions.appendChild(editBtn);
        } else {
            // Other's profile - show buttons BELOW bio
            if (!profileBioActions) return;

            if (isFollowing) {
                // Following button
                const followingBtn = document.createElement('button');
                followingBtn.className = 'following-btn';
                followingBtn.innerHTML = 'Following <i class="fa-solid fa-chevron-down"></i>';
                followingBtn.addEventListener('click', openUnfollowModal);
                profileBioActions.appendChild(followingBtn);

                // Contact button (only for business accounts)
                if (profileUser.businessType) {
                    const contactBtn = document.createElement('button');
                    contactBtn.className = 'contact-btn';
                    contactBtn.textContent = 'Contact';
                    contactBtn.addEventListener('click', handleContact);
                    profileBioActions.appendChild(contactBtn);
                }

                // Suggest button
                const suggestBtn = document.createElement('button');
                suggestBtn.className = 'suggest-btn';
                suggestBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i>';
                profileBioActions.appendChild(suggestBtn);
            } else {
                // Not following - show Follow button
                const followBtn = document.createElement('button');
                followBtn.className = 'follow-btn-profile';
                followBtn.textContent = 'Follow';
                followBtn.addEventListener('click', handleFollow);
                profileBioActions.appendChild(followBtn);

                // Contact button (only for business accounts on public profiles)
                if (profileUser.businessType && profileUser.visibility === 'Public') {
                    const contactBtn = document.createElement('button');
                    contactBtn.className = 'contact-btn';
                    contactBtn.textContent = 'Contact';
                    contactBtn.addEventListener('click', handleContact);
                    profileBioActions.appendChild(contactBtn);
                }
            }
        }
    }

    // ---------- Render Posts Grid ----------
    function renderPosts(posts) {
        postsGrid.innerHTML = '';

        if (!posts || posts.length === 0) {
            postsGrid.style.display = 'none';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        postsGrid.style.display = 'grid';

        posts.forEach(post => {
            const postItem = document.createElement('div');
            postItem.className = 'post-item';
            postItem.innerHTML = `
                <img src="${post.mediaUrl}" alt="Post">
                ${post.mediaType === 'reel' ? '<div class="reel-indicator"><i class="fa-solid fa-play"></i></div>' : ''}
                <div class="post-overlay">
                    <div class="overlay-stat">
                        <i class="fa-solid fa-heart"></i>
                        <span>${formatNumber(post.likesCount || 0)}</span>
                    </div>
                    <div class="overlay-stat">
                        <i class="fa-solid fa-comment"></i>
                        <span>${formatNumber(post.commentsCount || 0)}</span>
                    </div>
                </div>
            `;
            postsGrid.appendChild(postItem);
        });
    }

    // ---------- Show Private Message ----------
    function showPrivateMessage() {
        postsGrid.style.display = 'none';
        emptyState.classList.add('hidden');
        privateMessage.classList.remove('hidden');
    }

    // ---------- Hide Private Message ----------
    function hidePrivateMessage() {
        privateMessage.classList.add('hidden');
    }

    // ---------- Handle Follow ----------
    async function handleFollow() {
        try {
            const response = await fetch(`/api/profile/${profileUser.username}/follow`, {
                method: 'POST'
            });

            if (response.ok) {
                isFollowing = true;
                profileUser.followersCount = (profileUser.followersCount || 0) + 1;
                followersCount.textContent = formatNumber(profileUser.followersCount);
                renderActionButtons();

                // If account was private, reload posts
                if (profileUser.visibility === 'Private') {
                    hidePrivateMessage();
                    await loadPosts();
                }
            }
        } catch (error) {
            console.error('Error following user:', error);
        }
    }

    // ---------- Handle Unfollow ----------
    async function handleUnfollow() {
        try {
            const response = await fetch(`/api/profile/${profileUser.username}/follow`, {
                method: 'DELETE'
            });

            if (response.ok) {
                isFollowing = false;
                profileUser.followersCount = Math.max(0, (profileUser.followersCount || 1) - 1);
                followersCount.textContent = formatNumber(profileUser.followersCount);
                renderActionButtons();
                closeUnfollowModal();

                // If account is private, hide posts
                if (profileUser.visibility === 'Private') {
                    showPrivateMessage();
                }
            }
        } catch (error) {
            console.error('Error unfollowing user:', error);
        }
    }

    // ---------- Handle Contact ----------
    function handleContact() {
        // TODO: Implement contact functionality
        // Could open email, show phone number, etc.
        if (profileUser.contactNo) {
            alert(`Contact: ${profileUser.contactNo}`);
        } else if (profileUser.website) {
            window.open(profileUser.website.startsWith('http') ? profileUser.website : 'https://' + profileUser.website, '_blank');
        }
    }

    // ---------- Unfollow Modal ----------
    function openUnfollowModal() {
        unfollowModalPicture.src = profileUser.profilePictureUrl || '/uploads/default/default-avatar.png';
        unfollowModalUsername.textContent = profileUser.username;
        unfollowModal.classList.add('active');
    }

    function closeUnfollowModal() {
        unfollowModal.classList.remove('active');
    }

    // Modal event listeners
    unfollowModalClose.addEventListener('click', closeUnfollowModal);
    unfollowConfirmBtn.addEventListener('click', handleUnfollow);
    unfollowModal.addEventListener('click', function (e) {
        if (e.target === unfollowModal) {
            closeUnfollowModal();
        }
    });

    // ---------- Tab Switching ----------
    function switchTab(tab) {
        currentTab = tab;

        // Update tab styling
        if (tab === 'posts') {
            tabPosts.classList.add('active');
            tabReels.classList.remove('active');
        } else {
            tabPosts.classList.remove('active');
            tabReels.classList.add('active');
        }

        // Update URL without refresh
        const newUrl = tab === 'reels'
            ? `/${profileUser.username}/reels`
            : `/${profileUser.username}`;

        window.history.pushState({ tab }, '', newUrl);

        // Load posts for the tab
        loadPosts();
    }

    tabPosts.addEventListener('click', () => switchTab('posts'));
    tabReels.addEventListener('click', () => switchTab('reels'));

    // Handle browser back/forward
    window.addEventListener('popstate', function (e) {
        const path = window.location.pathname;
        if (path.endsWith('/reels')) {
            currentTab = 'reels';
            tabPosts.classList.remove('active');
            tabReels.classList.add('active');
        } else {
            currentTab = 'posts';
            tabPosts.classList.add('active');
            tabReels.classList.remove('active');
        }
        loadPosts();
    });

    // ---------- Load Posts ----------
    async function loadPosts() {
        const type = currentTab === 'reels' ? 'reel' : 'all';

        // Check if profile is private and user is not following
        if (!isOwnProfile && profileUser.visibility === 'Private' && !isFollowing) {
            showPrivateMessage();
            return;
        }

        hidePrivateMessage();
        const posts = await fetchPosts(profileUser.username, type);
        renderPosts(posts);
    }

    // ---------- Utility: Format Number ----------
    function formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return num.toString();
    }

    // ---------- Initialize ----------
    async function init() {
        // Get username from URL
        const username = getUsernameFromUrl();
        if (!username) {
            window.location.href = '/index.html';
            return;
        }

        // Fetch current logged-in user
        currentUser = await fetchCurrentUser();
        if (!currentUser) return;

        // Fetch profile data
        profileUser = await fetchProfileData(username);
        if (!profileUser) return;

        // Check if viewing own profile
        isOwnProfile = currentUser.username.toLowerCase() === profileUser.username.toLowerCase();

        // Fetch follow status if not own profile
        if (!isOwnProfile) {
            isFollowing = await fetchFollowStatus(username);
        }

        // Render profile
        renderProfileHeader();
        renderActionButtons();

        // Set initial tab from URL
        if (currentTab === 'reels') {
            tabPosts.classList.remove('active');
            tabReels.classList.add('active');
        }

        // Load posts
        await loadPosts();
    }

    // Start initialization
    init();
});

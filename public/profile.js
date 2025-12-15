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

    // Verification Elements
    const verifiedBadge = document.getElementById('verified-badge');
    const optionsModal = document.getElementById('options-modal');
    const profileOptionsBtn = document.getElementById('profile-options-btn');
    const btnApplyVerification = document.getElementById('btn-apply-verification');
    const verificationStatusDisplay = document.getElementById('verification-status-display');
    const btnCancelOptions = document.getElementById('btn-cancel-options');
    const verificationFormModal = document.getElementById('verification-form-modal');
    const verificationModalClose = document.getElementById('verification-modal-close');
    const verificationForm = document.getElementById('verification-form');
    const verificationDocInput = document.getElementById('verification-doc');
    const fileNameDisplay = document.getElementById('file-name-display');
    const verificationStatusMsg = document.getElementById('verification-status-msg');
    const btnSubmitVerification = document.getElementById('btn-submit-verification');

    // ---------- State ----------
    let currentUser = null;      // Logged-in user
    let profileUser = null;      // Profile being viewed - fetched from db below
    let isOwnProfile = false;
    let isFollowing = false;
    let isPending = false;       // Follow request pending (for private accounts)
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
                    // User not found - show 404 page
                    window.location.href = '/404.html';
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
            if (!response.ok) return { isFollowing: false, isPending: false };
            const data = await response.json();
            return { isFollowing: data.isFollowing, isPending: data.isPending || false };
        } catch (error) {
            console.error('Error fetching follow status:', error);
            return { isFollowing: false, isPending: false };
        }
    }

    // ---------- Fetch Posts ---------- /api/profile/${username}/posts?type=${type}
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
        profilePicture.src = profileUser.profilePictureUrl || DEFAULT_AVATAR_PATH;

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

        // Verified Badge
        if (profileUser.isVerified) {
            verifiedBadge.classList.remove('hidden');
        } else {
            verifiedBadge.classList.add('hidden');
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

        // Restrict access for private non-followed profiles
        if (!isOwnProfile && profileUser.visibility === 'Private' && !isFollowing) {
            followersCount.parentElement.style.cursor = 'default';
            followingCount.parentElement.style.cursor = 'default';
        } else {
            followersCount.parentElement.style.cursor = 'pointer';
            followingCount.parentElement.style.cursor = 'pointer';
        }
    }

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
            editBtn.href = '/settings.html';
            editBtn.className = 'edit-profile-btn';
            editBtn.textContent = 'Edit profile';
            profileActions.appendChild(editBtn);

            // Enable options button for own profile
            profileOptionsBtn.style.display = 'block';
            profileOptionsBtn.onclick = openOptionsModal;
        } else {
            // Hide options button for others (or implement report/block later)
            profileOptionsBtn.style.display = 'none';

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
            } else if (isPending) {
                // Requested button - pending follow request for private account
                const requestedBtn = document.createElement('button');
                requestedBtn.className = 'requested-btn';
                requestedBtn.textContent = 'Requested';
                requestedBtn.addEventListener('click', handleCancelRequest);
                profileBioActions.appendChild(requestedBtn);
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

            // Handle Media Type (Image vs Video)
            let mediaContent;
            if (post.mediaType === 'reel') {
                mediaContent = `<video src="${post.mediaUrl}" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>
                                <div class="reel-indicator"><i class="fa-solid fa-play"></i></div>`;
            } else {
                mediaContent = `<img src="${post.mediaUrl}" alt="Post">`;
            }

            postItem.innerHTML = `
                ${mediaContent}
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

            // Add Click Event to Open Modal
            postItem.addEventListener('click', () => openPostModal(post));

            postsGrid.appendChild(postItem);
        });
    }

    // ---------- Post Detail Modal Logic ----------
    const postModal = document.getElementById('post-modal');
    const postModalClose = document.getElementById('post-modal-close');
    const postModalMediaContainer = document.getElementById('post-modal-media-container');
    const postModalUserPic = document.getElementById('post-modal-user-pic');
    const postModalUsername = document.getElementById('post-modal-username');
    const postModalCaptionPic = document.getElementById('post-modal-caption-pic');
    const postModalCaptionUsername = document.getElementById('post-modal-caption-username');
    const postModalCaptionText = document.getElementById('post-modal-caption-text');
    const postModalTime = document.getElementById('post-modal-time');
    const postModalLikes = document.getElementById('post-modal-likes');
    const postModalDate = document.getElementById('post-modal-date');

    function openPostModal(post) {
        // Populate User Info
        postModalUserPic.src = profileUser.profilePictureUrl || DEFAULT_AVATAR_PATH;
        postModalUsername.textContent = profileUser.username;
        postModalCaptionPic.src = profileUser.profilePictureUrl || DEFAULT_AVATAR_PATH;
        postModalCaptionUsername.textContent = profileUser.username;

        // Populate Caption & Stats
        postModalCaptionText.textContent = post.caption || '';

        // Render Tags
        const existingTags = postModalCaptionText.parentNode.querySelector('.post-tags');
        if (existingTags) existingTags.remove();

        if (post.tags && post.tags.length > 0) {
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'post-tags';

            post.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'post-tag';
                tagSpan.textContent = `#${tag.trim()}`;
                tagsContainer.appendChild(tagSpan);
            });

            // Insert tags before the time element if it exists, otherwise append
            if (postModalTime) {
                postModalCaptionText.parentNode.insertBefore(tagsContainer, postModalTime);
            } else {
                postModalCaptionText.parentNode.appendChild(tagsContainer);
            }
        }

        postModalLikes.textContent = `${formatNumber(post.likesCount || 0)} likes`;

        // Format Date
        const date = new Date(post.createdAt);
        postModalDate.textContent = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        // Simplified timeago for caption
        postModalTime.textContent = timeAgo(date);

        // Populate Media (Image vs Video)
        postModalMediaContainer.innerHTML = '';
        if (post.mediaType === 'reel') {
            const video = document.createElement('video');
            video.src = post.mediaUrl;
            video.controls = false;
            video.autoplay = true;
            video.loop = true;
            video.muted = true; // Start muted

            // Create mute button
            const muteBtn = document.createElement('button');
            muteBtn.className = 'reel-mute-btn';
            muteBtn.dataset.muted = 'true';
            muteBtn.title = 'Unmute';
            muteBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';

            // Mute button click handler
            muteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isMuted = muteBtn.dataset.muted === 'true';
                video.muted = !isMuted;
                muteBtn.dataset.muted = !isMuted;
                muteBtn.querySelector('i').className = isMuted ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
                muteBtn.title = isMuted ? 'Mute' : 'Unmute';
            });

            // Click video to pause/play
            video.addEventListener('click', () => {
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
            });

            postModalMediaContainer.appendChild(video);
            postModalMediaContainer.appendChild(muteBtn);
        } else {
            const img = document.createElement('img');
            img.src = post.mediaUrl;
            postModalMediaContainer.appendChild(img);
        }

        // ---------- Delete / Options Logic ----------
        // Remove functionality of old options button to prevent duplicates
        const oldOptionsBtn = document.querySelector('.post-modal-header .post-options-btn');
        if (oldOptionsBtn) oldOptionsBtn.remove();

        if (isOwnProfile) {
            const header = document.querySelector('.post-modal-header');

            // Create options button
            const optionsBtn = document.createElement('button');
            optionsBtn.className = 'post-options-btn';
            optionsBtn.innerHTML = '<i class="fa-solid fa-ellipsis"></i>';
            optionsBtn.title = 'Options';

            optionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openPostOptionsModal(post.contentId);
            });

            header.appendChild(optionsBtn);
        }

        // Show Modal
        postModal.classList.add('active');
        setupPostModalInteractions(post);
    }

    // ---------- Post Options Modal (Curtain style) ----------
    function openPostOptionsModal(contentId) {
        // Create modal elements dynamically if not already present specially for posts
        // or reuse existing options modal structure but for posts

        let modal = document.getElementById('post-options-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'post-options-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content options-modal">
                    <div class="options-list">
                        <button class="options-btn delete-btn" id="btn-delete-post" style="color: #ed4956; font-weight: 700;">Delete</button>
                        <button class="options-btn cancel-btn" id="btn-cancel-post-options">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Add event listeners (delegated or static)
            const cancelBtn = modal.querySelector('#btn-cancel-post-options');
            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }

        // Update delete button action for current post
        const deleteBtn = modal.querySelector('#btn-delete-post');
        // Remove old listeners to avoid duplicates - cloning is a simple way
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

        newDeleteBtn.addEventListener('click', () => {
            deletePost(contentId);
            modal.classList.remove('active');
        });

        // Show modal
        modal.classList.add('active');
    }

    async function deletePost(contentId) {
        try {
            const response = await fetch(`/api/content/${contentId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                closePostModal();
                // Reload posts to reflect deletion
                await loadPosts();

                // Update stats locally
                if (profileUser) {
                    profileUser.postsCount = Math.max(0, (profileUser.postsCount || 0) - 1);
                    const postsCountEl = document.getElementById('posts-count');
                    if (postsCountEl) postsCountEl.textContent = formatNumber(profileUser.postsCount);
                }
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to delete post');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('An error occurred while deleting the post');
        }
    }

    function closePostModal() {
        postModal.classList.remove('active');
        // Stop video playback when closed
        postModalMediaContainer.innerHTML = '';

        // Reset listeners/state if needed
        const likeBtn = postModal.querySelector('.action-btn:first-child');
        if (likeBtn) {
            const newBtn = likeBtn.cloneNode(true);
            likeBtn.parentNode.replaceChild(newBtn, likeBtn);
        }
    }

    // ---------- Post Modal Interactions (Like & Comment) ----------

    function setupPostModalInteractions(post) {
        const contentId = post.contentId;
        const likeBtn = postModal.querySelector('.action-btn:first-child');
        const commentInput = postModal.querySelector('.post-add-comment input');
        const postBtn = postModal.querySelector('.post-add-comment button');
        const commentsSection = document.getElementById('post-comments-section');

        // Reset Comment Input
        commentInput.value = '';
        postBtn.disabled = true;

        // Reset Like Button (to outline initially, update after check)
        updateModalLikeButton(likeBtn, false);

        // Fetch and Render Comments
        fetchPostComments(contentId);

        // Check Like Status
        checkPostLikeStatus(contentId, likeBtn);

        // Like Button Listener
        // Remove old listener by cloning
        const newLikeBtn = likeBtn.cloneNode(true);
        likeBtn.parentNode.replaceChild(newLikeBtn, likeBtn);

        newLikeBtn.addEventListener('click', () => togglePostLike(newLikeBtn, contentId));

        // Post Comment Listener
        const newPostBtn = postBtn.cloneNode(true);
        postBtn.parentNode.replaceChild(newPostBtn, postBtn);

        newPostBtn.addEventListener('click', () => postNewComment(contentId, commentInput, newPostBtn));

        // Input Listener
        commentInput.oninput = () => {
            newPostBtn.disabled = commentInput.value.trim().length === 0;
        };
        // Enter key to post
        commentInput.onkeypress = (e) => {
            if (e.key === 'Enter' && !newPostBtn.disabled) {
                postNewComment(contentId, commentInput, newPostBtn);
            }
        };
    }

    async function fetchPostComments(contentId) {
        const section = document.getElementById('post-comments-section');
        // Keep caption, remove others
        const captionItem = section.querySelector('.caption-item');
        section.innerHTML = '';
        if (captionItem) section.appendChild(captionItem);

        try {
            const response = await fetch(`/api/actions/comment/${contentId}`);
            if (response.ok) {
                const comments = await response.json();
                renderPostComments(comments, section);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    }

    function renderPostComments(comments, container) {
        comments.forEach(comment => {
            const el = document.createElement('div');
            el.className = 'comment-item';
            el.innerHTML = `
                <img src="${comment.profilePictureUrl || '/uploads/default/default-avatar.png'}" alt="${comment.username}" class="comment-avatar">
                <div class="comment-content">
                    <span class="comment-username">${comment.username}</span>
                    <span class="comment-text">${escapeHtml(comment.text)}</span>
                    <div class="comment-time">${timeAgo(new Date(comment.actionDate))}</div>
                </div>
            `;
            container.appendChild(el);

            // Nested replies could be recursive here, but for now simple list is better than nothing
            if (comment.replies && comment.replies.length > 0) {
                comment.replies.forEach(reply => {
                    const replyEl = document.createElement('div');
                    replyEl.className = 'comment-item reply-item';
                    replyEl.style.marginLeft = '40px';
                    replyEl.innerHTML = `
                        <img src="${reply.profilePictureUrl || '/uploads/default/default-avatar.png'}" alt="${reply.username}" class="comment-avatar" style="width: 24px; height: 24px;">
                        <div class="comment-content">
                            <span class="comment-username">${reply.username}</span>
                            <span class="comment-text">${escapeHtml(reply.text)}</span>
                            <div class="comment-time">${timeAgo(new Date(reply.actionDate))}</div>
                        </div>
                    `;
                    container.appendChild(replyEl);
                });
            }
        });
    }

    async function checkPostLikeStatus(contentId, btn) {
        try {
            const response = await fetch(`/api/actions/like/${contentId}/check`);
            if (response.ok) {
                const data = await response.json();
                updateModalLikeButton(btn, data.liked);
                if (data.liked) btn.classList.add('liked');
            }
        } catch (error) {
            console.error('Error checking like status:', error);
        }
    }

    async function togglePostLike(btn, contentId) {
        const isLiked = btn.classList.contains('liked');
        const countEl = document.getElementById('post-modal-likes');

        // Optimistic Update
        btn.classList.toggle('liked');
        updateModalLikeButton(btn, !isLiked);

        // Parse current count
        let currentCount = parseInt(countEl.textContent.replace(/\D/g, '')) || 0;
        currentCount = isLiked ? Math.max(0, currentCount - 1) : currentCount + 1;
        countEl.textContent = `${formatNumber(currentCount)} likes`;

        try {
            const method = isLiked ? 'DELETE' : 'POST';
            const response = await fetch(`/api/actions/like/${contentId}`, { method });

            if (response.ok) {
                const data = await response.json();
                // Ensure synced
                const newLiked = data.liked !== undefined ? data.liked : !isLiked;
                btn.classList.toggle('liked', newLiked);
                updateModalLikeButton(btn, newLiked);
                if (data.likeCount !== undefined) {
                    countEl.textContent = `${formatNumber(data.likeCount)} likes`;
                }
            } else {
                // Revert
                btn.classList.toggle('liked', isLiked);
                updateModalLikeButton(btn, isLiked);
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert
            btn.classList.toggle('liked', isLiked);
            updateModalLikeButton(btn, isLiked);
        }
    }

    function updateModalLikeButton(btn, isLiked) {
        const icon = btn.querySelector('i');
        const svg = btn.querySelector('svg');

        // If it's using FontAwesome <i> tag
        if (icon) {
            // Replace <i> with <svg> for consistency with reels or just style the <i>
            // But user wants filled red heart.
            // Let's replace <i> with the SVG used in reels.
            const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            newSvg.setAttribute('aria-label', isLiked ? 'Unlike' : 'Like');
            newSvg.setAttribute('height', '24');
            newSvg.setAttribute('width', '24');
            newSvg.setAttribute('viewBox', '0 0 24 24');
            btn.innerHTML = '';
            btn.appendChild(newSvg);
            fillSvgContent(newSvg, isLiked);
        } else if (svg) {
            fillSvgContent(svg, isLiked);
        }
    }

    function fillSvgContent(svg, isLiked) {
        if (isLiked) {
            svg.innerHTML = '<title>Unlike</title><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938Z"></path>';
            svg.setAttribute('fill', '#ff3040');
            svg.removeAttribute('stroke');
        } else {
            svg.innerHTML = '<title>Like</title><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z"></path>';
            svg.setAttribute('fill', 'currentColor');
            svg.removeAttribute('stroke');
        }
    }

    async function postNewComment(contentId, input, btn) {
        const text = input.value.trim();
        if (!text) return;

        try {
            const response = await fetch(`/api/actions/comment/${contentId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (response.ok) {
                input.value = '';
                btn.disabled = true;
                // Refresh comments
                fetchPostComments(contentId);
            }
        } catch (error) {
            console.error('Error posting comment:', error);
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }


    // Utility: Simple Time Ago
    function timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m";
        return Math.floor(seconds) + "s";
    }

    // Modal Listeners
    if (postModalClose) postModalClose.addEventListener('click', closePostModal);
    if (postModal) {
        postModal.addEventListener('click', (e) => {
            if (e.target === postModal) closePostModal();
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
                const data = await response.json();

                if (data.requested) {
                    // Private account - request sent, now pending
                    isPending = true;
                    isFollowing = false;
                } else if (data.followed) {
                    // Public account - now following
                    isFollowing = true;
                    isPending = false;
                    profileUser.followersCount = (profileUser.followersCount || 0) + 1;
                    followersCount.textContent = formatNumber(profileUser.followersCount);
                }

                renderActionButtons();

                // If account was public and now following, reload posts
                if (isFollowing && profileUser.visibility === 'Private') {
                    hidePrivateMessage();
                    await loadPosts();
                }
            }
        } catch (error) {
            console.error('Error following user:', error);
        }
    }

    // ---------- Handle Cancel Request ----------
    async function handleCancelRequest() {
        try {
            const response = await fetch(`/api/profile/${profileUser.username}/follow`, {
                method: 'DELETE'
            });

            if (response.ok) {
                isPending = false;
                isFollowing = false;
                renderActionButtons();
            }
        } catch (error) {
            console.error('Error cancelling request:', error);
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
        // Could open email, show phone number, etc.
        if (profileUser.contactNo) {
            alert(`Contact: ${profileUser.contactNo}`);
        } else if (profileUser.website) {
            window.open(profileUser.website.startsWith('http') ? profileUser.website : 'https://' + profileUser.website, '_blank');
        }
    }

    // ---------- Unfollow Modal ----------
    function openUnfollowModal() {
        unfollowModalPicture.src = profileUser.profilePictureUrl || DEFAULT_AVATAR_PATH;
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

    // ---------- Verification Logic ----------

    function openOptionsModal() {
        optionsModal.classList.add('active');

        // Update functionality based on status
        if (profileUser.verificationStatus === 'Pending') {
            btnApplyVerification.style.display = 'none';
            verificationStatusDisplay.style.display = 'block';
            verificationStatusDisplay.textContent = 'Verification Pending';
            verificationStatusDisplay.style.color = 'var(--text-secondary)';
        } else if (profileUser.verificationStatus === 'Verified') {
            btnApplyVerification.style.display = 'none';
            verificationStatusDisplay.style.display = 'block';
            verificationStatusDisplay.textContent = 'Verified';
            verificationStatusDisplay.style.color = 'var(--accent-blue)';
        } else {
            // Rejected or null
            verificationStatusDisplay.style.display = 'none';
            btnApplyVerification.style.display = 'block';
            btnApplyVerification.textContent = 'Apply for Verification';
        }
    }

    function closeOptionsModal() {
        optionsModal.classList.remove('active');
    }

    function openVerificationModal() {
        closeOptionsModal();
        verificationFormModal.classList.add('active');
        verificationForm.reset();
        fileNameDisplay.textContent = '';
        verificationStatusMsg.textContent = '';
        verificationStatusMsg.className = 'status-msg';
    }

    function closeVerificationModal() {
        verificationFormModal.classList.remove('active');
    }

    // Option Modal Listeners
    if (btnCancelOptions) btnCancelOptions.addEventListener('click', closeOptionsModal);
    if (optionsModal) {
        optionsModal.addEventListener('click', (e) => {
            if (e.target === optionsModal) closeOptionsModal();
        });
    }

    if (btnApplyVerification) {
        btnApplyVerification.addEventListener('click', async () => {
            if (profileUser.verificationStatus === 'Pending') {
                closeOptionsModal();
                verificationFormModal.classList.add('active');
                verificationForm.style.display = 'none';
                verificationStatusMsg.textContent = 'Your verification request is pending approval.';
                verificationStatusMsg.className = 'status-msg';
                // Ensure file input is cleared or hidden if needed
            } else if (profileUser.verificationStatus === 'Verified') {
                closeOptionsModal();
                verificationFormModal.classList.add('active');
                verificationForm.style.display = 'none';
                verificationStatusMsg.textContent = 'Your account is already verified.';
                verificationStatusMsg.className = 'status-msg success';
            } else {
                // Rejected or null: Allow new application
                verificationForm.style.display = 'block';
                openVerificationModal();
            }
        });
    }

    // Verification Modal Listeners
    if (verificationModalClose) verificationModalClose.addEventListener('click', closeVerificationModal);
    if (verificationFormModal) {
        verificationFormModal.addEventListener('click', (e) => {
            if (e.target === verificationFormModal) closeVerificationModal();
        });
    }

    // File Input Listener
    if (verificationDocInput) {
        verificationDocInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                fileNameDisplay.textContent = this.files[0].name;
            } else {
                fileNameDisplay.textContent = '';
            }
        });
    }

    // Verification Form Submit
    if (verificationForm) {
        verificationForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const formData = new FormData(this);
            const submitBtn = document.getElementById('btn-submit-verification');

            verificationStatusMsg.textContent = 'Submitting...';
            verificationStatusMsg.className = 'status-msg';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/api/verification/apply', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    verificationStatusMsg.textContent = data.message;
                    verificationStatusMsg.classList.add('success');
                    verificationForm.reset();
                    fileNameDisplay.textContent = '';
                    setTimeout(() => {
                        closeVerificationModal();
                    }, 2000);
                } else {
                    verificationStatusMsg.textContent = data.message || 'Submission failed';
                    verificationStatusMsg.classList.add('error');
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Error submitting verification:', error);
                verificationStatusMsg.textContent = 'An error occurred. Please try again.';
                verificationStatusMsg.classList.add('error');
                submitBtn.disabled = false;
            }
        });
    }

    // ---------- Followers / Following Modal Logic ----------
    const followListModal = document.getElementById('follow-list-modal');
    const followListTitle = document.getElementById('follow-list-title');
    const followListContent = document.getElementById('follow-list-content');
    const followListEmpty = document.getElementById('follow-list-empty');
    const followListClose = document.getElementById('follow-list-close');
    const followListSearchInput = document.getElementById('follow-list-search-input');

    let currentFollowListType = ''; // 'followers' or 'following'

    // Open Modal
    async function openFollowListModal(type) {
        // Basic restrictions
        if (!processFollowListAccess(type)) return;

        currentFollowListType = type;
        followListTitle.textContent = type === 'followers' ? 'Followers' : 'Following';
        followListModal.classList.add('active');
        followListContent.innerHTML = '<div class="loading-spinner"></div>'; // Simple loading state
        followListEmpty.classList.add('hidden');
        if (followListSearchInput) followListSearchInput.value = '';

        try {
            const endpoint = `/api/profile/${profileUser.username}/${type}`;
            const response = await fetch(endpoint);

            if (response.status === 403) {
                followListContent.innerHTML = '<p class="error-msg">Private Account</p>';
                return;
            }

            if (!response.ok) throw new Error('Failed to fetch list');

            const users = await response.json();
            renderFollowList(users, type);

        } catch (error) {
            console.error(`Error fetching ${type}:`, error);
            followListContent.innerHTML = '<p class="error-msg">Failed to load list.</p>';
        }
    }

    // Check if user is allowed to view list (double check client side)
    function processFollowListAccess(type) {
        if (!profileUser) return false;
        if (isOwnProfile) return true;
        if (profileUser.visibility === 'Public') return true;
        if (profileUser.visibility === 'Private' && isFollowing) return true;
        return false;
    }

    // Render List
    function renderFollowList(users, type) {
        followListContent.innerHTML = '';

        if (!users || users.length === 0) {
            followListEmpty.classList.remove('hidden');
            document.getElementById('follow-list-empty-text').textContent =
                type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.';
            return;
        }

        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'follow-list-item';

            const isVerifiedHTML = user.isVerified ?
                `<span class="verified-badge-small" title="Verified">
                    <svg aria-label="Verified" class="x1lliihq x1n2onr6" fill="rgb(0, 149, 246)" height="12" role="img" viewBox="0 0 40 40" width="12">
                        <title>Verified</title>
                        <path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fill-rule="evenodd"></path>
                    </svg>
                </span>` : '';

            userItem.innerHTML = `
                <div class="user-info-group" onclick="window.location.href='/profile/${user.username}'" style="cursor: pointer;">
                    <img src="${user.profilePictureUrl}" alt="${user.username}" class="user-avatar">
                    <div class="user-text">
                        <span class="user-username">${user.username} ${isVerifiedHTML}</span>
                        <span class="user-fullname">${user.profileName || ''}</span>
                    </div>
                </div>
            `;

            // Action Button Logic
            let actionBtn = null;

            if (isOwnProfile) {
                if (type === 'followers') {
                    // Remove Follower Button
                    actionBtn = document.createElement('button');
                    actionBtn.className = 'action-btn-small remove-btn';
                    actionBtn.textContent = 'Remove';
                    actionBtn.onclick = (e) => {
                        e.stopPropagation();
                        removeFollower(user.username, userItem);
                    };
                } else {
                    // Following - Unfollow Button
                    actionBtn = document.createElement('button');
                    actionBtn.className = 'action-btn-small following-btn'; // "Following" style
                    actionBtn.textContent = 'Following';
                    actionBtn.onclick = (e) => {
                        e.stopPropagation();
                        // Open main unfollow modal for confirmation (reusing existing logic slightly modified)
                        openUnfollowModalForList(user);
                    };
                }
            } else {
                // Viewing someone else's list
                // If I follow them, show "Following". If not, show "Follow".
                // BUT, checking "Am I following this person in the list?" requires more data.
                // Ideally the API should return "isFollowing" boolean for me relative to each user in list.
                // For now, let's leave this blank or simple. Implementing fully requires `isFollowing` in API response.
                // Let's implement partial logic if I am viewing someone else's following/followers
                // Just showing the list is the main requirement. Actions on third parties is bonus/complex.
            }

            if (actionBtn) {
                userItem.appendChild(actionBtn);
            }

            followListContent.appendChild(userItem);
        });
    }

    // Remove Follower Logic
    async function removeFollower(username, itemElement) {
        if (!confirm(`Remove ${username} as a follower?`)) return;

        try {
            const response = await fetch(`/api/profile/${profileUser.username}/followers/${username}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                itemElement.remove();
                // Update stats
                profileUser.followersCount = Math.max(0, (profileUser.followersCount || 1) - 1);
                followersCount.textContent = formatNumber(profileUser.followersCount);
                if (followListContent.children.length === 0) {
                    followListEmpty.classList.remove('hidden');
                    document.getElementById('follow-list-empty-text').textContent = 'No followers yet.';
                }
            } else {
                alert('Failed to remove follower');
            }
        } catch (error) {
            console.error('Error removing follower:', error);
        }
    }

    // Unfollow from List Logic (Reuse modal but handle specific user)
    let userToUnfollowFromList = null;

    function openUnfollowModalForList(user) {
        userToUnfollowFromList = user;
        // Populate existing modal
        unfollowModalPicture.src = user.profilePictureUrl || DEFAULT_AVATAR_PATH;
        unfollowModalUsername.textContent = user.username;
        unfollowModal.classList.add('active');

        // Temporarily override the confirm button to handle LIST unfollow
        // But need to be careful not to break the main profile unfollow logic.
        // A better way is to check `userToUnfollowFromList` in the main handler.
    }

    // Modify existing handleUnfollow to support list unfollow
    // We need to change the existing `handleUnfollow` or just make a new one.
    // The existing `handleUnfollow` uses `profileUser`. 
    // Let's modify the click listener for `unfollowConfirmBtn`.

    const originalUnfollowHandler = handleUnfollow;

    // Remove old listener
    unfollowConfirmBtn.removeEventListener('click', handleUnfollow);

    // Add new unified listener
    unfollowConfirmBtn.addEventListener('click', async () => {
        if (userToUnfollowFromList) {
            await handleUnfollowFromList(userToUnfollowFromList);
            userToUnfollowFromList = null; // Reset
        } else {
            await originalUnfollowHandler();
        }
    });

    // Add close listener reset
    const originalCloseUnfollow = closeUnfollowModal;
    // We need to ensure userToUnfollowFromList is cleared on close

    // Override close function? No, just add listener to modal close
    unfollowModalClose.addEventListener('click', () => { userToUnfollowFromList = null; });
    // Also on background click
    unfollowModal.addEventListener('click', (e) => {
        if (e.target === unfollowModal) userToUnfollowFromList = null;
    });


    async function handleUnfollowFromList(user) {
        try {
            const response = await fetch(`/api/profile/${user.username}/follow`, {
                method: 'DELETE'
            });

            if (response.ok) {
                closeUnfollowModal();
                // Remove from DOM list
                // We need to find the specific item. 
                // Creating a specific ID for items or re-rendering is easier.
                // Let's just reload the list or remove the specific element if we had a reference.
                // Since `openFollowListModal` is async and we are inside `handleUnfollowFromList`,
                // we'll just reload the list for simplicity.
                openFollowListModal('following');

                // Update stats
                profileUser.followingCount = Math.max(0, (profileUser.followingCount || 1) - 1);
                followingCount.textContent = formatNumber(profileUser.followingCount);
            }
        } catch (error) {
            console.error('Error unfollowing user:', error);
        }
    }


    // Listeners for Stats
    const followersStat = document.getElementById('followers-stat');
    const followingStat = document.getElementById('following-stat');

    if (followersStat) {
        followersStat.addEventListener('click', () => openFollowListModal('followers'));
    }
    if (followingStat) {
        followingStat.addEventListener('click', () => openFollowListModal('following'));
    }

    // Close Listener
    if (followListClose) {
        followListClose.addEventListener('click', () => {
            followListModal.classList.remove('active');
        });
    }

    // Click outside to close
    if (followListModal) {
        followListModal.addEventListener('click', (e) => {
            if (e.target === followListModal) {
                followListModal.classList.remove('active');
            }
        });
    }

    // Search Listener
    if (followListSearchInput) {
        followListSearchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.follow-list-item');
            items.forEach(item => {
                const username = item.querySelector('.user-username').textContent.toLowerCase();
                const fullname = item.querySelector('.user-fullname').textContent.toLowerCase();
                if (username.includes(term) || fullname.includes(term)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

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
        const type = currentTab === 'reels' ? 'reel' : 'image';

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
            const followStatus = await fetchFollowStatus(username);
            isFollowing = followStatus.isFollowing;
            isPending = followStatus.isPending;
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

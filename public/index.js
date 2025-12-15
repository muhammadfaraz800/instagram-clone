/**
 * Home Page JavaScript
 * Handles feed, suggestions, post modal with comments, and interactions
 */

// ============================================================
// Global State
// ============================================================
let currentUser = null;
let feedOffset = 0;
let feedSeed = Math.floor(Math.random() * 1000000).toString();
let isLoadingFeed = false;
let hasMorePosts = true;
let currentModalContentId = null;
let currentModalLiked = false;

// Verified badge SVG
const VERIFIED_BADGE_SVG = `<svg aria-label="Verified" class="verified-badge-inline" fill="rgb(0, 149, 246)" height="12" role="img" viewBox="0 0 40 40" width="12" style="margin-left: 4px;"><title>Verified</title><path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fill-rule="evenodd"></path></svg>`;

// ============================================================
// Splash Screen
// ============================================================
function hideSplashScreen() {
    const splash = document.getElementById('splashScreen');
    if (splash) {
        splash.classList.add('hidden');
        setTimeout(() => splash.remove(), 400);
    }
}

// ============================================================
// Auth Check & Initial Load
// ============================================================
fetch('/api/auth/me')
    .then(res => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
    })
    .then(user => {
        currentUser = user;
        console.log('Logged in as:', user.username);

        // Update sidebar user info
        document.getElementById('sidebar-username').innerHTML = user.username +
            (user.verificationStatus === 'Verified' ? VERIFIED_BADGE_SVG : '');
        document.getElementById('sidebar-account-type').textContent = user.profileName || user.username;

        const profileLink = document.getElementById('sidebar-profile-link');
        if (profileLink) profileLink.href = '/' + user.username;

        if (user.profilePictureUrl) {
            const largeProfilePic = document.querySelector('.profile-pic-large img');
            if (largeProfilePic) largeProfilePic.src = user.profilePictureUrl;

            const smallProfilePic = document.querySelector('.profile-icon-small img');
            if (smallProfilePic) smallProfilePic.src = user.profilePictureUrl;
        }

        // Load content after auth
        fetchHomeFeed();
        fetchSuggestions();

        if (document.readyState === 'complete') {
            hideSplashScreen();
        } else {
            window.addEventListener('load', hideSplashScreen);
        }
    })
    .catch(err => {
        console.error('Auth error:', err);
        localStorage.clear();
        window.location.href = '/login.html';
    });

function logout() {
    fetch('/api/auth/logout', { method: 'POST' })
        .then(() => {
            localStorage.clear();
            window.location.href = '/login.html';
        });
}

// ============================================================
// Home Feed
// ============================================================
async function fetchHomeFeed(append = false) {
    if (isLoadingFeed || (!append && !hasMorePosts)) return;
    isLoadingFeed = true;

    const loadingEl = document.getElementById('postsLoading');
    if (loadingEl) loadingEl.style.display = 'flex';

    try {
        const response = await fetch(`/api/feed?offset=${feedOffset}&seed=${feedSeed}&limit=10`);
        const data = await response.json();

        if (data.success) {
            renderPosts(data.posts, append);
            feedOffset = data.nextOffset;
            hasMorePosts = data.hasMore;

            if (!hasMorePosts && loadingEl) {
                loadingEl.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error fetching feed:', error);
    } finally {
        isLoadingFeed = false;
        if (loadingEl && hasMorePosts) loadingEl.style.display = 'none';
    }
}

function renderPosts(posts, append = false) {
    const container = document.getElementById('postsContainer');
    if (!container) return;

    if (!append) {
        // Keep only the loading element
        const loadingEl = document.getElementById('postsLoading');
        container.innerHTML = '';
        if (loadingEl) container.appendChild(loadingEl);
    }

    // Show empty state if no posts
    if (posts.length === 0 && !append) {
        const emptyState = document.createElement('div');
        emptyState.className = 'feed-empty-state';
        emptyState.innerHTML = `
            <div class="empty-icon">
                <i class="fa-regular fa-image"></i>
            </div>
            <h3>No Posts Yet</h3>
            <p>When users you follow post, you'll see their photos and videos here.</p>
        `;
        const loadingEl = document.getElementById('postsLoading');
        if (loadingEl) loadingEl.style.display = 'none';
        container.appendChild(emptyState);
        return;
    }


    posts.forEach((post, index) => {
        const article = document.createElement('article');
        article.className = 'post';
        article.dataset.contentId = post.contentId;

        const timeAgo = getTimeAgo(new Date(post.postDate));
        const isVideo = post.contentType === 'Reel';

        article.innerHTML = `
            <div class="post-header">
                <div class="post-user">
                    <a href="/${post.username}" class="post-user-link">
                        <div class="story-ring small">
                            <img src="${post.profilePictureUrl}" alt="${post.username}">
                        </div>
                        <div class="post-user-info">
                            <span class="username">${post.username}${post.verificationStatus === 'Verified' ? VERIFIED_BADGE_SVG : ''}</span>
                            <span class="post-time">• ${timeAgo}</span>
                        </div>
                    </a>
                </div>
                <i class="fa-solid fa-ellipsis post-options"></i>
            </div>
            <div class="post-image-container" data-content-id="${post.contentId}">
                ${isVideo ?
                `<video src="${post.path}" loop muted playsinline></video>` :
                `<img src="${post.path}" alt="Post">`
            }
            </div>
            <div class="post-actions">
                <div class="action-buttons">
                    <button class="post-like-btn" data-content-id="${post.contentId}">
                        <i class="fa-regular fa-heart"></i>
                    </button>
                    <button class="post-comment-btn" data-content-id="${post.contentId}">
                        <i class="fa-regular fa-comment"></i>
                    </button>
                </div>
            </div>
            <div class="post-likes" data-content-id="${post.contentId}">
                ${formatNumber(post.totalLikes)} likes
            </div>
            <div class="post-caption">
                <a href="/${post.username}" class="username">${post.username}</a>
                <span class="caption-text">${escapeHtml(post.caption || '')}</span>
            </div>
            ${post.totalComments > 0 ?
                `<div class="post-comments-link" data-content-id="${post.contentId}">
                    View all ${post.totalComments} comments
                </div>` : ''
            }
            <div class="add-comment">
                <input type="text" placeholder="Add a comment..." data-content-id="${post.contentId}">
                <button class="post-inline-comment-btn" data-content-id="${post.contentId}" disabled>Post</button>
            </div>
        `;

        // Insert before the loading element
        const loadingEl = document.getElementById('postsLoading');
        if (loadingEl) {
            container.insertBefore(article, loadingEl);
        } else {
            container.appendChild(article);
        }

        // Setup event listeners
        setupPostEventListeners(article, post);
    });

    // Setup infinite scroll observer
    setupInfiniteScrollObserver();
}

function setupPostEventListeners(article, post) {
    // Click on image/video to open modal
    const mediaContainer = article.querySelector('.post-image-container');
    mediaContainer.addEventListener('click', () => openPostModal(post.contentId));

    // Comments link click
    const commentsLink = article.querySelector('.post-comments-link');
    if (commentsLink) {
        commentsLink.addEventListener('click', () => openPostModal(post.contentId));
    }

    // Comment button click
    const commentBtn = article.querySelector('.post-comment-btn');
    commentBtn.addEventListener('click', () => openPostModal(post.contentId));

    // Like button click
    const likeBtn = article.querySelector('.post-like-btn');
    setupLikeButton(likeBtn, post.contentId);

    // Inline comment input
    const commentInput = article.querySelector('.add-comment input');
    const postBtn = article.querySelector('.post-inline-comment-btn');

    commentInput.addEventListener('input', () => {
        postBtn.disabled = !commentInput.value.trim();
    });

    commentInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && commentInput.value.trim()) {
            postInlineComment(post.contentId, commentInput, postBtn);
        }
    });

    postBtn.addEventListener('click', () => {
        if (commentInput.value.trim()) {
            postInlineComment(post.contentId, commentInput, postBtn);
        }
    });

    // Video autoplay on scroll
    const video = article.querySelector('video');
    if (video) {
        setupVideoObserver(video);
    }
}

async function setupLikeButton(btn, contentId) {
    // Check initial like status
    try {
        const response = await fetch(`/api/actions/like/${contentId}/check`);
        const data = await response.json();
        if (data.liked) {
            btn.classList.add('liked');
            btn.querySelector('i').className = 'fa-solid fa-heart';
            btn.querySelector('i').style.color = '#ed4956';
        }
    } catch (error) {
        console.error('Error checking like status:', error);
    }

    btn.addEventListener('click', async () => {
        const isLiked = btn.classList.contains('liked');
        const icon = btn.querySelector('i');
        const likesEl = btn.closest('.post').querySelector('.post-likes');

        try {
            if (isLiked) {
                await fetch(`/api/actions/like/${contentId}`, { method: 'DELETE' });
                btn.classList.remove('liked');
                icon.className = 'fa-regular fa-heart';
                icon.style.color = '';
            } else {
                await fetch(`/api/actions/like/${contentId}`, { method: 'POST' });
                btn.classList.add('liked');
                icon.className = 'fa-solid fa-heart';
                icon.style.color = '#ed4956';
            }

            // Update likes count
            const countResponse = await fetch(`/api/feed/post/${contentId}`);
            const countData = await countResponse.json();
            if (countData.success) {
                likesEl.textContent = formatNumber(countData.post.totalLikes) + ' likes';
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    });
}

async function postInlineComment(contentId, input, btn) {
    const text = input.value.trim();
    if (!text) return;

    btn.disabled = true;

    try {
        const response = await fetch(`/api/actions/comment/${contentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            input.value = '';
            // Update comment count
            const postEl = input.closest('.post');
            let commentsLink = postEl.querySelector('.post-comments-link');

            if (!commentsLink) {
                commentsLink = document.createElement('div');
                commentsLink.className = 'post-comments-link';
                commentsLink.dataset.contentId = contentId;
                postEl.querySelector('.post-caption').after(commentsLink);
                commentsLink.addEventListener('click', () => openPostModal(contentId));
            }

            // Fetch updated count
            const countResponse = await fetch(`/api/feed/post/${contentId}`);
            const countData = await countResponse.json();
            if (countData.success) {
                commentsLink.textContent = `View all ${countData.post.totalComments} comments`;
            }
        }
    } catch (error) {
        console.error('Error posting comment:', error);
    } finally {
        btn.disabled = !input.value.trim();
    }
}

function setupVideoObserver(video) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                video.play().catch(() => { });
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.5 });

    observer.observe(video);
}

// Infinite scroll
let infiniteScrollObserver = null;

function setupInfiniteScrollObserver() {
    if (infiniteScrollObserver) infiniteScrollObserver.disconnect();

    const posts = document.querySelectorAll('.posts-container .post');
    if (posts.length < 3) return;

    const targetPost = posts[posts.length - 3];

    infiniteScrollObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMorePosts && !isLoadingFeed) {
            fetchHomeFeed(true);
        }
    }, { threshold: 0.1 });

    infiniteScrollObserver.observe(targetPost);
}

// ============================================================
// Suggestions
// ============================================================
async function fetchSuggestions() {
    try {
        const response = await fetch('/api/feed/suggestions');
        const data = await response.json();

        if (data.success) {
            renderSuggestions(data.suggestions);
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
}

function renderSuggestions(suggestions) {
    const container = document.getElementById('suggestionsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (suggestions.length === 0) {
        container.innerHTML = '<div class="no-suggestions">No suggestions available</div>';
        return;
    }

    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';

        item.innerHTML = `
            <a href="/${suggestion.username}" class="suggestion-link">
                <div class="suggestion-pic">
                    <img src="${suggestion.profilePictureUrl}" alt="${suggestion.username}">
                </div>
                <div class="suggestion-info">
                    <span class="username">${suggestion.username}${suggestion.verificationStatus === 'Verified' ? VERIFIED_BADGE_SVG : ''}</span>
                    <span class="relation">${suggestion.reasonText}</span>
                </div>
            </a>
            <button class="follow-btn" data-username="${suggestion.username}">Follow</button>
        `;

        const followBtn = item.querySelector('.follow-btn');
        followBtn.addEventListener('click', () => handleSuggestionFollow(suggestion.username, followBtn));

        container.appendChild(item);
    });
}

async function handleSuggestionFollow(username, btn) {
    btn.disabled = true;
    btn.textContent = '...';

    try {
        const response = await fetch(`/api/profile/${username}/follow`, { method: 'POST' });
        const data = await response.json();

        if (response.ok) {
            if (data.status === 'Pending') {
                btn.textContent = 'Requested';
                btn.classList.add('requested');
            } else {
                btn.textContent = 'Following';
                btn.classList.add('following');
            }
        } else {
            btn.textContent = 'Follow';
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error following user:', error);
        btn.textContent = 'Follow';
        btn.disabled = false;
    }
}

// ============================================================
// Post Modal
// ============================================================
async function openPostModal(contentId) {
    currentModalContentId = contentId;
    const modal = document.getElementById('homePostModal');
    const imageEl = document.getElementById('homePostModalImage');
    const videoEl = document.getElementById('homePostModalVideo');
    const authorPic = document.getElementById('homePostModalAuthorPic');
    const usernameEl = document.getElementById('homePostModalUsername');
    const captionEl = document.getElementById('homePostModalCaption');
    const likesEl = document.getElementById('homePostModalLikes');
    const dateEl = document.getElementById('homePostModalDate');
    const commentsContainer = document.getElementById('homePostModalComments');

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Loading state
    commentsContainer.innerHTML = '<div class="comments-loading">Loading...</div>';

    try {
        // Fetch post details
        const response = await fetch(`/api/feed/post/${contentId}`);
        const data = await response.json();

        if (!data.success) {
            console.error('Failed to fetch post details');
            return;
        }

        const post = data.post;

        // Set media
        if (post.contentType === 'Reel') {
            imageEl.style.display = 'none';
            videoEl.style.display = 'block';
            videoEl.src = post.path;
            videoEl.play().catch(() => { });
        } else {
            videoEl.style.display = 'none';
            imageEl.style.display = 'block';
            imageEl.src = post.path;
        }

        // Set author info
        authorPic.src = post.profilePictureUrl;
        usernameEl.innerHTML = `<a href="/${post.username}">${post.username}</a>` +
            (post.verificationStatus === 'Verified' ? VERIFIED_BADGE_SVG : '');

        // Set caption
        if (post.caption) {
            captionEl.innerHTML = `
                <div class="modal-caption-item">
                    <img src="${post.profilePictureUrl}" alt="${post.username}" class="caption-avatar">
                    <div class="caption-content">
                        <span class="caption-username"><a href="/${post.username}">${post.username}</a></span>
                        <span class="caption-text">${escapeHtml(post.caption)}</span>
                    </div>
                </div>
            `;
        } else {
            captionEl.innerHTML = '';
        }

        // Set likes and date
        likesEl.textContent = formatNumber(post.totalLikes) + ' likes';
        dateEl.textContent = formatDate(new Date(post.postDate));

        // Setup like button
        await setupModalLikeButton(contentId);

        // Fetch and render comments
        await fetchModalComments(contentId);

    } catch (error) {
        console.error('Error loading post modal:', error);
        commentsContainer.innerHTML = '<div class="comments-error">Failed to load comments</div>';
    }
}

async function setupModalLikeButton(contentId) {
    const likeBtn = document.getElementById('homePostModalLikeBtn');

    // Check like status
    try {
        const response = await fetch(`/api/actions/like/${contentId}/check`);
        const data = await response.json();
        currentModalLiked = data.liked;
        updateModalLikeButtonUI();
    } catch (error) {
        console.error('Error checking like status:', error);
    }

    // Remove old listener and add new one
    const newBtn = likeBtn.cloneNode(true);
    likeBtn.parentNode.replaceChild(newBtn, likeBtn);

    newBtn.addEventListener('click', async () => {
        try {
            if (currentModalLiked) {
                await fetch(`/api/actions/like/${contentId}`, { method: 'DELETE' });
                currentModalLiked = false;
            } else {
                await fetch(`/api/actions/like/${contentId}`, { method: 'POST' });
                currentModalLiked = true;
            }
            updateModalLikeButtonUI();

            // Update likes count
            const response = await fetch(`/api/feed/post/${contentId}`);
            const data = await response.json();
            if (data.success) {
                document.getElementById('homePostModalLikes').textContent =
                    formatNumber(data.post.totalLikes) + ' likes';

                // Also update in feed
                const feedLikesEl = document.querySelector(`.post-likes[data-content-id="${contentId}"]`);
                if (feedLikesEl) {
                    feedLikesEl.textContent = formatNumber(data.post.totalLikes) + ' likes';
                }

                const feedLikeBtn = document.querySelector(`.post-like-btn[data-content-id="${contentId}"]`);
                if (feedLikeBtn) {
                    const icon = feedLikeBtn.querySelector('i');
                    if (currentModalLiked) {
                        feedLikeBtn.classList.add('liked');
                        icon.className = 'fa-solid fa-heart';
                        icon.style.color = '#ed4956';
                    } else {
                        feedLikeBtn.classList.remove('liked');
                        icon.className = 'fa-regular fa-heart';
                        icon.style.color = '';
                    }
                }
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    });
}

function updateModalLikeButtonUI() {
    const likeBtn = document.getElementById('homePostModalLikeBtn');
    if (!likeBtn) return;

    const svg = likeBtn.querySelector('svg');
    if (currentModalLiked) {
        likeBtn.classList.add('liked');
        svg.innerHTML = `<path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938Z" fill="#ed4956"></path>`;
    } else {
        likeBtn.classList.remove('liked');
        svg.innerHTML = `<path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z"></path>`;
    }
}

async function fetchModalComments(contentId) {
    const container = document.getElementById('homePostModalComments');

    try {
        const response = await fetch(`/api/feed/post/${contentId}/comments`);
        const data = await response.json();

        if (data.success) {
            renderModalComments(data.comments, container);
        } else {
            container.innerHTML = '<div class="comments-error">Failed to load comments</div>';
        }
    } catch (error) {
        console.error('Error fetching comments:', error);
        container.innerHTML = '<div class="comments-error">Failed to load comments</div>';
    }
}

function renderModalComments(comments, container) {
    container.innerHTML = '';

    if (comments.length === 0) {
        container.innerHTML = '<div class="no-comments">No comments yet. Be the first!</div>';
        return;
    }

    comments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.className = 'modal-comment';
        commentEl.dataset.commentId = comment.commentId;

        const timeAgo = getTimeAgo(new Date(comment.commentDate));

        commentEl.innerHTML = `
            <img src="${comment.profilePictureUrl}" alt="${comment.username}" class="comment-avatar">
            <div class="comment-content">
                <div class="comment-text">
                    <a href="/${comment.username}" class="comment-username">${comment.username}</a>${comment.verificationStatus === 'Verified' ? VERIFIED_BADGE_SVG : ''}
                    <span>${escapeHtml(comment.commentText)}</span>
                </div>
                <div class="comment-meta">
                    <span class="comment-time">${timeAgo}</span>
                    ${comment.likesCount > 0 ? `<span class="comment-likes-count">${comment.likesCount} likes</span>` : ''}
                    <button class="comment-reply-btn">Reply</button>
                </div>
                ${comment.replyCount > 0 ?
                `<button class="view-replies-btn" data-comment-id="${comment.commentId}">
                        ─── View replies (${comment.replyCount})
                    </button>
                    <div class="replies-container" data-comment-id="${comment.commentId}"></div>` : ''
            }
            </div>
            <button class="comment-like-btn" data-comment-id="${comment.commentId}">
                <i class="fa-regular fa-heart"></i>
            </button>
        `;

        // View replies button
        const viewRepliesBtn = commentEl.querySelector('.view-replies-btn');
        if (viewRepliesBtn) {
            viewRepliesBtn.addEventListener('click', () => {
                loadCommentReplies(comment.commentId, commentEl.querySelector('.replies-container'));
                viewRepliesBtn.style.display = 'none';
            });
        }

        container.appendChild(commentEl);
    });
}

async function loadCommentReplies(commentId, container) {
    container.innerHTML = '<div class="replies-loading">Loading...</div>';

    try {
        const response = await fetch(`/api/feed/comment/${commentId}/replies`);
        const data = await response.json();

        if (data.success) {
            container.innerHTML = '';
            data.replies.forEach(reply => {
                const replyEl = document.createElement('div');
                replyEl.className = 'modal-reply';

                const timeAgo = getTimeAgo(new Date(reply.replyDate));

                replyEl.innerHTML = `
                    <img src="${reply.profilePictureUrl}" alt="${reply.username}" class="reply-avatar">
                    <div class="reply-content">
                        <div class="reply-text">
                            <a href="/${reply.username}" class="reply-username">${reply.username}</a>${reply.verificationStatus === 'Verified' ? VERIFIED_BADGE_SVG : ''}
                            <span>${escapeHtml(reply.commentText)}</span>
                        </div>
                        <div class="reply-meta">
                            <span class="reply-time">${timeAgo}</span>
                            ${reply.likesCount > 0 ? `<span class="reply-likes-count">${reply.likesCount} likes</span>` : ''}
                        </div>
                    </div>
                `;

                container.appendChild(replyEl);
            });
        }
    } catch (error) {
        console.error('Error loading replies:', error);
        container.innerHTML = '<div class="replies-error">Failed to load replies</div>';
    }
}

function closePostModal() {
    const modal = document.getElementById('homePostModal');
    const videoEl = document.getElementById('homePostModalVideo');

    modal.classList.remove('active');
    document.body.style.overflow = '';

    // Stop video
    if (videoEl) {
        videoEl.pause();
        videoEl.src = '';
    }

    currentModalContentId = null;
}

// Modal event listeners
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('homePostModal');
    const closeBtn = document.getElementById('homePostModalClose');
    const commentInput = document.getElementById('homePostModalCommentInput');
    const postBtn = document.getElementById('homePostModalPostBtn');

    if (closeBtn) {
        closeBtn.addEventListener('click', closePostModal);
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closePostModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.classList.contains('active')) {
            closePostModal();
        }
    });

    // Comment input
    if (commentInput && postBtn) {
        commentInput.addEventListener('input', () => {
            postBtn.disabled = !commentInput.value.trim();
        });

        commentInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && commentInput.value.trim() && currentModalContentId) {
                await postModalComment();
            }
        });

        postBtn.addEventListener('click', async () => {
            if (commentInput.value.trim() && currentModalContentId) {
                await postModalComment();
            }
        });
    }
});

async function postModalComment() {
    const input = document.getElementById('homePostModalCommentInput');
    const btn = document.getElementById('homePostModalPostBtn');
    const text = input.value.trim();

    if (!text || !currentModalContentId) return;

    btn.disabled = true;

    try {
        const response = await fetch(`/api/actions/comment/${currentModalContentId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            input.value = '';
            btn.disabled = true;
            await fetchModalComments(currentModalContentId);

            // Update comment count in feed
            const response2 = await fetch(`/api/feed/post/${currentModalContentId}`);
            const data = await response2.json();
            if (data.success) {
                const commentsLink = document.querySelector(`.post-comments-link[data-content-id="${currentModalContentId}"]`);
                if (commentsLink) {
                    commentsLink.textContent = `View all ${data.post.totalComments} comments`;
                }
            }
        }
    } catch (error) {
        console.error('Error posting comment:', error);
    }
}

// ============================================================
// Utility Functions
// ============================================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd';
    if (seconds < 2592000) return Math.floor(seconds / 604800) + 'w';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}

// ============================================================
// Stories Navigation
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    const storiesContainer = document.getElementById('storiesContainer');
    const prevBtn = document.getElementById('storiesPrev');
    const nextBtn = document.getElementById('storiesNext');

    if (!storiesContainer || !prevBtn || !nextBtn) return;

    let isScrolling = false;

    function getStoryItemWidth() {
        const storyItem = storiesContainer.querySelector('.story-item');
        if (!storyItem) return 93;
        const style = window.getComputedStyle(storiesContainer);
        const gap = parseInt(style.gap) || 16;
        return storyItem.offsetWidth + gap;
    }

    function getHiddenStoriesCount(direction) {
        const storyWidth = getStoryItemWidth();
        const containerWidth = storiesContainer.offsetWidth;
        const scrollLeft = storiesContainer.scrollLeft;
        const maxScroll = storiesContainer.scrollWidth - containerWidth;

        if (direction === 'next') {
            return Math.ceil((maxScroll - scrollLeft) / storyWidth);
        } else {
            return Math.ceil(scrollLeft / storyWidth);
        }
    }

    function updateArrowVisibility() {
        const scrollLeft = storiesContainer.scrollLeft;
        const maxScroll = storiesContainer.scrollWidth - storiesContainer.offsetWidth;

        if (scrollLeft > 5) {
            prevBtn.classList.add('visible');
        } else {
            prevBtn.classList.remove('visible');
        }

        if (scrollLeft < maxScroll - 5) {
            nextBtn.classList.add('visible');
        } else {
            nextBtn.classList.remove('visible');
        }
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function animateScroll(targetScroll, duration) {
        if (isScrolling) return;
        isScrolling = true;

        const startScroll = storiesContainer.scrollLeft;
        const distance = targetScroll - startScroll;
        const startTime = performance.now();

        function step(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);

            storiesContainer.scrollLeft = startScroll + (distance * easedProgress);

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                isScrolling = false;
                updateArrowVisibility();
            }
        }

        requestAnimationFrame(step);
    }

    function scrollStories(direction) {
        if (isScrolling) return;

        const storyWidth = getStoryItemWidth();
        const hiddenCount = getHiddenStoriesCount(direction);
        const storiesToMove = Math.min(Math.max(hiddenCount, 1), 3);
        const scrollAmount = storyWidth * storiesToMove;

        let targetScroll;
        if (direction === 'next') {
            targetScroll = storiesContainer.scrollLeft + scrollAmount;
        } else {
            targetScroll = storiesContainer.scrollLeft - scrollAmount;
        }

        const maxScroll = storiesContainer.scrollWidth - storiesContainer.offsetWidth;
        targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

        animateScroll(targetScroll, 400);
    }

    prevBtn.addEventListener('click', () => scrollStories('prev'));
    nextBtn.addEventListener('click', () => scrollStories('next'));

    storiesContainer.addEventListener('scroll', () => {
        if (!isScrolling) updateArrowVisibility();
    });

    updateArrowVisibility();
    window.addEventListener('resize', updateArrowVisibility);
});

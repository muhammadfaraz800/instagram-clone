/**
 * Explore Page JavaScript
 * Handles grid loading, infinite scroll, and post modal
 */

document.addEventListener('DOMContentLoaded', () => {
    // Constants
    const DEFAULT_AVATAR_PATH = '/uploads/default/default-avatar.png';

    // State
    let offset = 0;
    const limit = 18;
    let isLoading = false;
    let hasMoreContent = true;
    const seed = Math.random().toString(36).substring(2, 15);
    let currentPostId = null;
    let isGlobalMuted = true; // Track global mute state - default to muted

    // Elements
    const exploreGrid = document.getElementById('exploreGrid');
    const exploreLoading = document.getElementById('exploreLoading');
    const scrollSentinel = document.getElementById('scrollSentinel');
    const postModal = document.getElementById('postModal');
    const modalClose = document.getElementById('modalClose');

    // Initialize
    fetchExploreGrid();
    setupInfiniteScroll();
    setupModalListeners();

    /**
     * Fetch explore grid items from API
     */
    async function fetchExploreGrid(append = false) {
        if (isLoading || !hasMoreContent) return;

        isLoading = true;

        try {
            const response = await fetch(`/api/explore/grid?offset=${offset}&seed=${seed}`);

            if (!response.ok) {
                throw new Error('Failed to fetch explore content');
            }

            const items = await response.json();

            if (items.length === 0) {
                hasMoreContent = false;
                if (!append) {
                    showEmptyState();
                }
            } else {
                if (!append) {
                    // Clear loading state for initial load
                    exploreLoading.classList.add('hidden');
                }

                renderGridItems(items, append);
                offset += items.length;

                if (items.length < limit) {
                    hasMoreContent = false;
                }
            }
        } catch (error) {
            console.error('Error fetching explore grid:', error);
            if (!append) {
                showErrorState();
            }
        } finally {
            isLoading = false;
        }
    }

    /**
     * Render grid items
     */
    function renderGridItems(items, append = false) {
        const fragment = document.createDocumentFragment();

        items.forEach(item => {
            const gridItem = createGridItem(item);
            fragment.appendChild(gridItem);
        });

        if (append) {
            exploreGrid.appendChild(fragment);
        } else {
            // Replace loading state with items
            exploreGrid.innerHTML = '';
            exploreGrid.appendChild(fragment);
        }
    }

    /**
     * Create a single grid item element
     */
    function createGridItem(item) {
        const div = document.createElement('div');
        div.className = 'explore-grid-item';
        div.dataset.contentId = item.contentId;

        // Media element
        if (item.contentType === 'Reel') {
            const video = document.createElement('video');
            video.src = item.path;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.preload = 'metadata';
            div.appendChild(video);

            // Play on hover
            div.addEventListener('mouseenter', () => video.play());
            div.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0;
            });

            // Reel indicator
            const indicator = document.createElement('div');
            indicator.className = 'explore-content-indicator';
            indicator.innerHTML = '<i class="fa-solid fa-play"></i>';
            div.appendChild(indicator);

            // Duration badge
            if (item.reelDuration) {
                const duration = document.createElement('div');
                duration.className = 'explore-duration-badge';
                duration.textContent = formatDuration(item.reelDuration);
                div.appendChild(duration);
            }
        } else {
            const img = document.createElement('img');
            img.src = item.path;
            img.alt = '';
            img.loading = 'lazy';
            div.appendChild(img);
        }

        // Hover overlay (will show stats when post is clicked and we fetch them)
        const overlay = document.createElement('div');
        overlay.className = 'explore-grid-overlay';
        div.appendChild(overlay);

        // Click handler
        div.addEventListener('click', () => openPostModal(item.contentId));

        return div;
    }

    /**
     * Format duration in seconds to M:SS
     */
    function formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Setup infinite scroll using IntersectionObserver
     */
    function setupInfiniteScroll() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isLoading && hasMoreContent) {
                    fetchExploreGrid(true);
                }
            });
        }, {
            rootMargin: '200px'
        });

        observer.observe(scrollSentinel);
    }

    /**
     * Setup modal event listeners
     */
    function setupModalListeners() {
        // Close modal
        modalClose.addEventListener('click', closePostModal);

        postModal.addEventListener('click', (e) => {
            if (e.target === postModal) {
                closePostModal();
            }
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !postModal.classList.contains('hidden')) {
                closePostModal();
            }
        });

        // Comment input
        const commentInput = document.getElementById('commentInput');
        const postCommentBtn = document.getElementById('postCommentBtn');

        commentInput.addEventListener('input', () => {
            postCommentBtn.classList.toggle('active', commentInput.value.trim().length > 0);
        });

        postCommentBtn.addEventListener('click', () => {
            if (commentInput.value.trim() && currentPostId) {
                postComment(currentPostId, commentInput.value.trim());
            }
        });

        commentInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && commentInput.value.trim() && currentPostId) {
                postComment(currentPostId, commentInput.value.trim());
            }
        });

        // Like button
        const likeBtn = document.getElementById('likeBtn');
        likeBtn.addEventListener('click', () => {
            if (currentPostId) {
                toggleLike(currentPostId);
            }
        });
    }

    /**
     * Open post modal and load details
     */
    async function openPostModal(contentId) {
        currentPostId = contentId;
        postModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        try {
            // Fetch post details
            const response = await fetch(`/api/explore/post/${contentId}`);
            if (!response.ok) throw new Error('Failed to fetch post');

            const post = await response.json();
            renderPostModal(post);

            // Fetch comments
            await fetchComments(contentId);

        } catch (error) {
            console.error('Error loading post:', error);
        }
    }

    /**
     * Close post modal
     */
    function closePostModal() {
        postModal.classList.add('hidden');
        document.body.style.overflow = '';
        currentPostId = null;

        // Stop any playing videos
        const video = document.querySelector('.explore-modal-media video');
        if (video) {
            video.pause();
        }
    }

    /**
     * Render post details in modal
     */
    function renderPostModal(post) {
        // Media
        const mediaContainer = document.getElementById('modalMedia');
        mediaContainer.innerHTML = '';

        if (post.contentType === 'Reel') {
            // Video wrapper for custom controls
            const videoWrapper = document.createElement('div');
            videoWrapper.className = 'explore-video-wrapper';

            const video = document.createElement('video');
            video.src = post.path;
            video.autoplay = true;
            video.loop = true;
            video.playsInline = true;
            video.muted = isGlobalMuted; // Use global mute state - default muted
            videoWrapper.appendChild(video);

            // Play/Pause overlay (shows when paused)
            const playOverlay = document.createElement('div');
            playOverlay.className = 'explore-video-play-overlay';
            playOverlay.innerHTML = '<i class="fa-solid fa-play"></i>';
            playOverlay.style.display = 'none';
            videoWrapper.appendChild(playOverlay);

            // Volume button - sync icon with actual mute state
            const volumeBtn = document.createElement('button');
            volumeBtn.className = 'explore-video-volume-btn';
            volumeBtn.innerHTML = isGlobalMuted ?
                '<i class="fa-solid fa-volume-xmark"></i>' :
                '<i class="fa-solid fa-volume-high"></i>';
            videoWrapper.appendChild(volumeBtn);

            // Click to play/pause
            video.addEventListener('click', () => {
                if (video.paused) {
                    video.play();
                    playOverlay.style.display = 'none';
                } else {
                    video.pause();
                    playOverlay.style.display = 'flex';
                }
            });

            // Volume toggle - persist state globally
            volumeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                video.muted = !video.muted;
                isGlobalMuted = video.muted; // Persist state for future videos
                volumeBtn.innerHTML = video.muted ?
                    '<i class="fa-solid fa-volume-xmark"></i>' :
                    '<i class="fa-solid fa-volume-high"></i>';
            });

            mediaContainer.appendChild(videoWrapper);
        } else {
            const img = document.createElement('img');
            img.src = post.path;
            img.alt = '';
            mediaContainer.appendChild(img);
        }

        // Author info
        document.getElementById('authorAvatar').src = post.profilePictureUrl || DEFAULT_AVATAR_PATH;
        const usernameLink = document.getElementById('authorUsername');
        usernameLink.textContent = post.username;
        usernameLink.href = `/${post.username}`;

        // Verified badge
        const verifiedBadge = document.getElementById('authorVerified');
        verifiedBadge.style.display = post.verificationStatus === 'Verified' ? 'inline' : 'none';

        // Caption
        document.getElementById('captionAvatar').src = post.profilePictureUrl || DEFAULT_AVATAR_PATH;
        document.getElementById('captionUsername').textContent = post.username;
        document.getElementById('captionText').textContent = post.caption || '';

        // Tags
        const tagsContainer = document.getElementById('captionTags');
        if (post.tags && post.tags.length > 0) {
            tagsContainer.innerHTML = post.tags.map(tag =>
                `<span class="tag">#${tag}</span>`
            ).join('');
        } else {
            tagsContainer.innerHTML = '';
        }

        // Time
        document.getElementById('captionTime').textContent = formatTimeAgo(post.postDate);
        document.getElementById('postTime').textContent = formatDate(post.postDate);

        // Likes
        const likesCount = document.getElementById('likesCount');
        likesCount.textContent = `${post.totalLikes.toLocaleString()} likes`;

        // Like button state
        const likeBtn = document.getElementById('likeBtn');
        if (post.userLiked) {
            likeBtn.classList.add('liked');
            likeBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
        } else {
            likeBtn.classList.remove('liked');
            likeBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
        }
    }

    /**
     * Fetch and render comments
     */
    async function fetchComments(contentId) {
        const commentsList = document.getElementById('commentsList');
        commentsList.innerHTML = '<div class="explore-loading-comments">Loading comments...</div>';

        try {
            const response = await fetch(`/api/explore/post/${contentId}/comments`);
            if (!response.ok) throw new Error('Failed to fetch comments');

            const comments = await response.json();
            renderComments(comments);

        } catch (error) {
            console.error('Error fetching comments:', error);
            commentsList.innerHTML = '<div class="explore-no-comments">Error loading comments</div>';
        }
    }

    /**
     * Render comments list
     */
    function renderComments(comments) {
        const commentsList = document.getElementById('commentsList');

        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="explore-no-comments">No comments yet</div>';
            return;
        }

        const html = comments.map(comment => `
            <div class="explore-comment" data-comment-id="${comment.commentId}">
                <a href="/${comment.username}">
                    <img src="${comment.profilePictureUrl || DEFAULT_AVATAR_PATH}" alt="" class="explore-comment-avatar">
                </a>
                <div class="explore-comment-content">
                    <div class="explore-comment-text">
                        <a href="/${comment.username}" class="explore-comment-username">${comment.username}</a>
                        ${comment.verificationStatus === 'Verified' ? `
                            <span class="verified-badge-small">
                                <svg aria-label="Verified" fill="rgb(0, 149, 246)" height="12" viewBox="0 0 40 40" width="12">
                                    <path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fill-rule="evenodd"></path>
                                </svg>
                            </span>
                        ` : ''}
                        ${comment.commentText}
                    </div>
                    <div class="explore-comment-actions">
                        <span class="explore-comment-action">${formatTimeAgo(comment.commentDate)}</span>
                        ${comment.likesCount > 0 ? `<span class="explore-comment-action">${comment.likesCount} likes</span>` : ''}
                        <span class="explore-comment-action">Reply</span>
                    </div>
                </div>
                <button class="explore-comment-like-btn">
                    <i class="fa-regular fa-heart"></i>
                </button>
            </div>
            ${comment.replyCount > 0 ? `
                <div class="explore-view-replies" data-comment-id="${comment.commentId}" data-reply-count="${comment.replyCount}">
                    View ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}
                </div>
                <div class="explore-replies-container" id="replies-${comment.commentId}" style="display: none;"></div>
            ` : ''}
        `).join('');

        commentsList.innerHTML = html;

        // Attach reply toggle handlers
        const viewRepliesBtns = commentsList.querySelectorAll('.explore-view-replies');
        viewRepliesBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const commentId = btn.dataset.commentId;
                toggleReplies(commentId, btn);
            });
        });
    }

    /**
     * Toggle replies visibility
     */
    async function toggleReplies(commentId, toggleBtn) {
        const repliesContainer = document.getElementById(`replies-${commentId}`);

        if (repliesContainer.style.display === 'none') {
            // Show and load replies
            repliesContainer.style.display = 'block';
            toggleBtn.innerHTML = `<span>Hide replies</span>`;

            // Load replies if not already loaded
            if (repliesContainer.innerHTML === '') {
                try {
                    const response = await fetch(`/api/explore/comments/${commentId}/replies`);
                    if (!response.ok) throw new Error('Failed to fetch replies');

                    const replies = await response.json();
                    renderReplies(replies, repliesContainer);

                } catch (error) {
                    console.error('Error fetching replies:', error);
                    repliesContainer.innerHTML = '<div class="explore-no-comments">Error loading replies</div>';
                }
            }
        } else {
            // Hide replies
            repliesContainer.style.display = 'none';
            const replyCount = toggleBtn.dataset.replyCount;
            toggleBtn.innerHTML = `View ${replyCount} ${replyCount === '1' ? 'reply' : 'replies'}`;
        }
    }

    /**
     * Render replies
     */
    function renderReplies(replies, container) {
        const html = replies.map(reply => `
            <div class="explore-reply">
                <a href="/${reply.username}">
                    <img src="${reply.profilePictureUrl || DEFAULT_AVATAR_PATH}" alt="" class="explore-comment-avatar">
                </a>
                <div class="explore-comment-content">
                    <div class="explore-comment-text">
                        <a href="/${reply.username}" class="explore-comment-username">${reply.username}</a>
                        ${reply.verificationStatus === 'Verified' ? `
                            <span class="verified-badge-small">
                                <svg aria-label="Verified" fill="rgb(0, 149, 246)" height="12" viewBox="0 0 40 40" width="12">
                                    <path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fill-rule="evenodd"></path>
                                </svg>
                            </span>
                        ` : ''}
                        ${reply.commentText}
                    </div>
                    <div class="explore-comment-actions">
                        <span class="explore-comment-action">${formatTimeAgo(reply.replyDate)}</span>
                        ${reply.likesCount > 0 ? `<span class="explore-comment-action">${reply.likesCount} likes</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    /**
     * Toggle like on post
     */
    async function toggleLike(contentId) {
        const likeBtn = document.getElementById('likeBtn');
        const likesCount = document.getElementById('likesCount');
        const isLiked = likeBtn.classList.contains('liked');

        try {
            const response = await fetch(`/api/actions/${contentId}/like`, {
                method: 'POST'
            });

            if (response.ok) {
                if (isLiked) {
                    likeBtn.classList.remove('liked');
                    likeBtn.innerHTML = '<i class="fa-regular fa-heart"></i>';
                    // Decrement likes
                    const currentLikes = parseInt(likesCount.textContent) || 0;
                    likesCount.textContent = `${Math.max(0, currentLikes - 1).toLocaleString()} likes`;
                } else {
                    likeBtn.classList.add('liked');
                    likeBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
                    // Increment likes
                    const currentLikes = parseInt(likesCount.textContent) || 0;
                    likesCount.textContent = `${(currentLikes + 1).toLocaleString()} likes`;

                    // Add pop animation
                    likeBtn.style.transform = 'scale(1.2)';
                    setTimeout(() => {
                        likeBtn.style.transform = 'scale(1)';
                    }, 200);
                }
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    }

    /**
     * Post a comment
     */
    async function postComment(contentId, text) {
        const commentInput = document.getElementById('commentInput');
        const postCommentBtn = document.getElementById('postCommentBtn');

        postCommentBtn.disabled = true;

        try {
            const response = await fetch(`/api/actions/${contentId}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ comment: text })
            });

            if (response.ok) {
                commentInput.value = '';
                postCommentBtn.classList.remove('active');

                // Refresh comments
                await fetchComments(contentId);
            }
        } catch (error) {
            console.error('Error posting comment:', error);
        } finally {
            postCommentBtn.disabled = false;
        }
    }

    /**
     * Format time ago
     */
    function formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        const diffWeek = Math.floor(diffDay / 7);

        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin}m`;
        if (diffHour < 24) return `${diffHour}h`;
        if (diffDay < 7) return `${diffDay}d`;
        return `${diffWeek}w`;
    }

    /**
     * Format date for display
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }

    /**
     * Show empty state
     */
    function showEmptyState() {
        exploreLoading.innerHTML = `
            <i class="fa-regular fa-compass" style="font-size: 48px; margin-bottom: 16px;"></i>
            <p>No content to explore yet</p>
        `;
    }

    /**
     * Show error state
     */
    function showErrorState() {
        exploreLoading.innerHTML = `
            <i class="fa-solid fa-exclamation-circle" style="font-size: 48px; margin-bottom: 16px; color: #ed4956;"></i>
            <p>Error loading content</p>
            <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #0095f6; border: none; border-radius: 8px; color: #fff; cursor: pointer;">Retry</button>
        `;
    }
});

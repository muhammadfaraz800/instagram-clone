/**
 * Reels Page JavaScript
 * Handles reel fetching, vertical navigation (scroll-snap & keyboard), and interactions
 */

document.addEventListener('DOMContentLoaded', function () {
    const reelsContainer = document.getElementById('reelsContainer');
    const navUpBtn = document.getElementById('reelNavUp');
    const navDownBtn = document.getElementById('reelNavDown');

    let reels = [];
    let currentReelIndex = 0;
    const DEFAULT_AVATAR_PATH = '/uploads/default/default-avatar.png';

    // Check if we're accessing a specific reel
    const pathParts = window.location.pathname.split('/');
    const specificContentId = pathParts.length > 2 ? pathParts[2] : null;

    /**
     * Initialize the reels page
     */
    async function init() {
        await fetchReels();
        if (reels.length > 0) {
            renderReels();
            setupNavigation();
            setupKeyboardNavigation();
            setupVideoAutoplay();

            // If specific content ID, scroll to it
            if (specificContentId) {
                scrollToReel(specificContentId);
            }
        } else {
            showEmptyState();
        }
    }

    /**
     * Fetch reels from API
     */
    async function fetchReels() {
        try {
            let url = '/api/reels/feed';

            // If specific content ID, fetch that reel first
            if (specificContentId) {
                try {
                    const specificRes = await fetch(`/api/reels/${specificContentId}`);
                    if (specificRes.ok) {
                        const specificReel = await specificRes.json();
                        reels = [specificReel];
                    }
                } catch (err) {
                    console.error('Error fetching specific reel:', err);
                }
            }

            // Fetch feed reels
            const response = await fetch(url);
            if (response.ok) {
                const feedReels = await response.json();
                // Merge specific reel with feed, avoiding duplicates
                if (specificContentId && reels.length > 0) {
                    const filteredFeed = feedReels.filter(r => r.contentId !== specificContentId);
                    reels = [...reels, ...filteredFeed];
                } else {
                    reels = feedReels;
                }
            } else if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
        } catch (error) {
            console.error('Error fetching reels:', error);
        }
    }

    /**
     * Render reels to the container
     */
    function renderReels() {
        if (reels.length === 0) {
            showEmptyState();
            return;
        }

        reelsContainer.innerHTML = reels.map((reel, index) => `
            <div class="reel-item" data-index="${index}" data-content-id="${reel.contentId}">
                <div class="reel-video-container">
                    <video 
                        class="reel-video" 
                        src="${reel.path}" 
                        loop 
                        muted 
                        playsinline
                        preload="metadata"
                    ></video>
                    
                    <!-- Mute Button -->
                    <button class="reel-mute-btn" data-muted="true" title="Unmute">
                        <i class="fa-solid fa-volume-xmark"></i>
                    </button>
                    
                    <!-- Overlay Content -->
                    <div class="reel-overlay">
                        <div class="reel-user-info">
                            <a href="/${reel.author}">
                                <img src="${reel.profilePictureUrl || DEFAULT_AVATAR_PATH}" alt="${reel.author}" class="reel-user-avatar">
                            </a>
                            <a href="/${reel.author}" class="reel-username">
                                ${reel.author}
                                ${reel.verificationStatus === 'Verified' ? `
                                    <span class="verified-badge" title="Verified">
                                        <svg aria-label="Verified" fill="rgb(0, 149, 246)" height="12" viewBox="0 0 40 40" width="12">
                                            <path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fill-rule="evenodd"></path>
                                        </svg>
                                    </span>
                                ` : ''}
                            </a>
                        </div>
                        <div class="reel-caption">
                            ${reel.caption || ''}
                            ${reel.caption && reel.caption.length > 100 ? '<span class="reel-caption-more">... more</span>' : ''}
                        </div>
                        ${reel.tags && reel.tags.length > 0 ? `
                            <div class="reel-tags">
                                ${reel.tags.map(tag => `<span class="reel-tag">#${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="reel-actions">
                        <button class="reel-action-btn like-btn" data-content-id="${reel.contentId}">
                            <i class="fa-regular fa-heart"></i>
                            <span class="reel-action-count">${formatCount(reel.likeCount)}</span>
                        </button>
                        <button class="reel-action-btn comment-btn" data-content-id="${reel.contentId}">
                            <i class="fa-regular fa-comment"></i>
                            <span class="reel-action-count">${formatCount(reel.commentCount)}</span>
                        </button>
                        <button class="reel-action-btn share-btn" data-content-id="${reel.contentId}">
                            <i class="fa-regular fa-paper-plane"></i>
                        </button>
                        <div class="reel-action-btn">
                            <img src="${reel.profilePictureUrl || DEFAULT_AVATAR_PATH}" alt="thumbnail" class="reel-thumbnail">
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners for action buttons
        setupActionButtons();
        setupMuteButtons();
    }

    /**
     * Format large numbers (e.g., 3300000 -> 3.3M)
     */
    function formatCount(count) {
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1) + 'M';
        } else if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'K';
        }
        return count.toString();
    }

    /**
     * Setup navigation button handlers
     */
    function setupNavigation() {
        navUpBtn.addEventListener('click', () => navigateReel('up'));
        navDownBtn.addEventListener('click', () => navigateReel('down'));

        // Update button states on scroll
        reelsContainer.addEventListener('scroll', updateNavButtonStates);
        updateNavButtonStates();
    }

    /**
     * Setup keyboard navigation (Arrow Up/Down)
     */
    function setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateReel('up');
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateReel('down');
            }
        });
    }

    /**
     * Navigate to previous or next reel
     */
    function navigateReel(direction) {
        const reelItems = document.querySelectorAll('.reel-item');
        if (reelItems.length === 0) return;

        // Calculate current index based on scroll position
        const containerHeight = reelsContainer.clientHeight;
        const scrollTop = reelsContainer.scrollTop;
        currentReelIndex = Math.round(scrollTop / containerHeight);

        if (direction === 'up' && currentReelIndex > 0) {
            currentReelIndex--;
        } else if (direction === 'down' && currentReelIndex < reelItems.length - 1) {
            currentReelIndex++;
        }

        // Scroll to the reel with smooth animation
        reelItems[currentReelIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Scroll to a specific reel by content ID
     */
    function scrollToReel(contentId) {
        const targetReel = document.querySelector(`.reel-item[data-content-id="${contentId}"]`);
        if (targetReel) {
            targetReel.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
    }

    /**
     * Update navigation button disabled states
     */
    function updateNavButtonStates() {
        const containerHeight = reelsContainer.clientHeight;
        const scrollTop = reelsContainer.scrollTop;
        const scrollHeight = reelsContainer.scrollHeight;

        // Disable up button if at top
        navUpBtn.disabled = scrollTop < 10;

        // Disable down button if at bottom
        navDownBtn.disabled = scrollTop + containerHeight >= scrollHeight - 10;
    }

    /**
     * Setup video autoplay on scroll (Intersection Observer)
     */
    function setupVideoAutoplay() {
        const options = {
            root: reelsContainer,
            rootMargin: '0px',
            threshold: 0.7
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target.querySelector('.reel-video');
                if (video) {
                    if (entry.isIntersecting) {
                        video.play().catch(err => console.log('Autoplay prevented:', err));
                    } else {
                        video.pause();
                    }
                }
            });
        }, options);

        document.querySelectorAll('.reel-item').forEach(item => {
            observer.observe(item);
        });
    }

    /**
     * Setup mute/unmute buttons for videos
     */
    function setupMuteButtons() {
        document.querySelectorAll('.reel-mute-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const video = btn.closest('.reel-video-container').querySelector('.reel-video');
                const isMuted = btn.dataset.muted === 'true';

                video.muted = !isMuted;
                btn.dataset.muted = !isMuted;

                const icon = btn.querySelector('i');
                icon.className = isMuted ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
                btn.title = isMuted ? 'Mute' : 'Unmute';
            });
        });
    }

    /**
     * Setup action button handlers (like, comment, share)
     */
    function setupActionButtons() {
        // Like buttons
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const contentId = btn.dataset.contentId;
                const icon = btn.querySelector('i');
                const count = btn.querySelector('.reel-action-count');

                // Toggle like state (UI feedback)
                const isLiked = btn.classList.toggle('liked');
                icon.className = isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';

                // TODO: Implement actual like API call
                // For now, just update UI
            });
        });

        // Comment buttons
        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const contentId = btn.dataset.contentId;
                // TODO: Open comments modal
                console.log('Open comments for:', contentId);
            });
        });

        // Share buttons
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const contentId = btn.dataset.contentId;
                // Copy link to clipboard
                const url = `${window.location.origin}/reels/${contentId}`;
                navigator.clipboard.writeText(url).then(() => {
                    console.log('Link copied:', url);
                    // TODO: Show toast notification
                });
            });
        });
    }

    /**
     * Show empty state when no reels available
     */
    function showEmptyState() {
        reelsContainer.innerHTML = `
            <div class="reels-empty">
                <i class="fa-solid fa-film"></i>
                <h2>No Reels Available</h2>
                <p>There are no reels to show right now. Check back later!</p>
            </div>
        `;

        // Disable navigation buttons
        if (navUpBtn) navUpBtn.disabled = true;
        if (navDownBtn) navDownBtn.disabled = true;
    }

    // Initialize the page
    init();
});

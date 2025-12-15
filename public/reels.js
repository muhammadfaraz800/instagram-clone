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
    let isGlobalMuted = false; // Global mute state - default unmuted

    // Pagination state
    let offset = 0;
    const limit = 10;
    let isLoading = false;
    let hasMoreReels = true;
    let seed = Math.random().toString(36).substring(7); // Generate random seed on load

    const DEFAULT_AVATAR_PATH = '/uploads/default/default-avatar.png';

    // Check if we're accessing a specific reel
    const pathParts = window.location.pathname.split('/');
    const specificContentId = pathParts.length > 2 ? pathParts[2] : null;

    /**
     * Render skeleton loading items
     * @param {number} count - Number of skeleton items to render
     */
    function renderSkeletons(count = 3) {
        const skeletonHtml = Array(count).fill(0).map(() => `
            <div class="reel-skeleton">
                <div class="reel-skeleton-video">
                    <div class="reel-skeleton-overlay">
                        <div class="reel-skeleton-user">
                            <div class="reel-skeleton-avatar skeleton"></div>
                            <div class="reel-skeleton-username skeleton"></div>
                        </div>
                        <div class="reel-skeleton-caption skeleton"></div>
                        <div class="reel-skeleton-caption-short skeleton"></div>
                    </div>
                </div>
            </div>
        `).join('');

        reelsContainer.innerHTML = skeletonHtml;
    }

    /**
     * Remove skeleton loading items
     */
    function removeSkeletons() {
        const skeletons = reelsContainer.querySelectorAll('.reel-skeleton');
        skeletons.forEach(skeleton => skeleton.remove());
    }

    /**
     * Preload video files to ensure smooth playback
     * @param {Array} reelsToPreload - Array of reel objects with video paths
     * @returns {Promise} - Resolves when all videos are preloaded
     */
    function preloadVideos(reelsToPreload) {
        const preloadPromises = reelsToPreload.map(reel => {
            return new Promise((resolve) => {
                const video = document.createElement('video');
                video.preload = 'auto';

                // Resolve when video can play through without buffering
                video.oncanplaythrough = () => {
                    resolve();
                };

                // Also resolve on error to not block forever
                video.onerror = () => {
                    console.warn('Failed to preload video:', reel.path);
                    resolve();
                };

                // Timeout fallback - don't wait more than 10 seconds per video
                setTimeout(() => {
                    resolve();
                }, 10000);

                video.src = reel.path;
                video.load();
            });
        });

        return Promise.all(preloadPromises);
    }

    /**
     * Initialize the reels page
     */
    async function init() {
        // Show skeleton while loading
        renderSkeletons(3);

        // Initial fetch (this will handle preloading internally)
        await fetchReels(false, true); // Pass flag to indicate initial load with preload

        if (reels.length > 0) {
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
     * @param {boolean} append - Whether to append to existing reels or replace
     * @param {boolean} preload - Whether to preload videos before rendering (for initial load)
     */
    async function fetchReels(append = false, preload = false) {
        if (isLoading || !hasMoreReels) return;

        try {
            isLoading = true;
            let url = `/api/reels/feed?offset=${offset}&seed=${seed}`;

            // If specific content ID, fetch that reel first (only on initial load)
            if (specificContentId && !append && offset === 0) {
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
                const newReels = await response.json();

                if (newReels.length < limit) {
                    hasMoreReels = false;
                }

                if (newReels.length > 0) {
                    // Update offset for next fetch
                    offset += newReels.length;

                    if (append) {
                        // Append new reels
                        reels = [...reels, ...newReels];
                        renderReels(newReels, true); // Render only new reels and append
                    } else {
                        // Initial load
                        if (specificContentId && reels.length > 0) {
                            const filteredFeed = newReels.filter(r => r.contentId !== specificContentId);
                            reels = [...reels, ...filteredFeed];
                        } else {
                            reels = newReels;
                        }

                        // If preload flag is set, wait for videos to buffer before rendering
                        if (preload) {
                            console.log('Preloading videos for smooth playback...');
                            await preloadVideos(reels);
                            console.log('Videos preloaded, rendering reels...');
                        }

                        renderReels(reels, false); // Render all
                    }
                } else if (!append && reels.length === 0) {
                    // Only show empty state if initial load has no reels
                    showEmptyState();
                }
            } else if (response.status === 401) {
                window.location.href = '/login.html';
                return;
            }
        } catch (error) {
            console.error('Error fetching reels:', error);
        } finally {
            isLoading = false;
        }
    }

    /**
     * Render reels to the container
     * @param {Array} reelsToRender - The reels to render
     * @param {boolean} append - Whether to append to container
     */
    function renderReels(reelsToRender, append = false) {
        if (reelsToRender.length === 0 && !append) {
            showEmptyState();
            return;
        }

        const reelsHtml = reelsToRender.map((reel, index) => {
            // Calculate correct global index
            const globalIndex = append ? (reels.length - reelsToRender.length + index) : index;

            return `
            <div class="reel-item" data-index="${globalIndex}" data-content-id="${reel.contentId}">
                <div class="reel-video-container">
                    <video 
                        class="reel-video" 
                        src="${reel.path}" 
                        loop 
                        playsinline
                        preload="metadata"
                    ></video>
                    
                    <!-- Overlay Content (bottom-left) -->
                    <div class="reel-overlay">
                        <div class="reel-user-info">
                            <a href="/${reel.author}">
                                <img src="${reel.profilePictureUrl || DEFAULT_AVATAR_PATH}" alt="${reel.author}" class="reel-user-avatar">
                            </a>
                            <a href="/${reel.author}" class="reel-username">
                                ${reel.author}
                                ${reel.verificationStatus === 'Verified' ? `
                                    <span class="verified-badge" title="Verified">
                                        <svg aria-label="Verified" fill="rgb(0, 149, 246)" height="14" viewBox="0 0 40 40" width="14">
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
                        
                        <!-- Mute Button (bottom-left, next to caption) -->
                        <button class="reel-mute-btn" data-muted="false" title="Mute">
                            <i class="fa-solid fa-volume-high"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Action Buttons (OUTSIDE, right side) -->
                <div class="reel-actions">
                    <button class="reel-action-btn like-btn" data-content-id="${reel.contentId}">
                        <svg aria-label="Like" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24"><title>Like</title><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z"></path></svg>
                        <span class="reel-action-count">${formatCount(reel.likeCount)}</span>
                    </button>
                    <button class="reel-action-btn comment-btn" data-content-id="${reel.contentId}">
                        <svg aria-label="Comment" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24"><title>Comment</title><path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"></path></svg>
                        <span class="reel-action-count">${formatCount(reel.commentCount)}</span>
                    </button>
                </div>
            </div>
        `}).join('');

        if (append) {
            reelsContainer.insertAdjacentHTML('beforeend', reelsHtml);

            // Re-setup observers for ONLY new items? 
            // Better to re-run observers for all items or optimize to observe only new ones.
            // For simplicity, we re-run setup for everything, but IntersectionObserver is smart enough 
            // if we observe the same element again? Actually we should target new ones.
            // Let's just re-attach observers to newly added items.

            // Get the newly added elements (last N elements)
            const allItems = reelsContainer.querySelectorAll('.reel-item');
            const startIndex = reels.length - reelsToRender.length;

            for (let i = startIndex; i < allItems.length; i++) {
                const item = allItems[i];
                setupSingleItemObserver(item);
            }

            // Re-setup mute buttons specifically for new items
            setupMuteButtonsForNewItems(allItems, startIndex);
            setupActionButtonsForNewItems(allItems, startIndex);

            // Setup intersection observer for infinite scroll
            setupInfiniteScrollObserver();

        } else {
            reelsContainer.innerHTML = reelsHtml;
            // Setup everything for initial load
            setupActionButtons();
            setupMuteButtons();
            setupVideoAutoplay(); // This sets up observers for all items
            setupInfiniteScrollObserver();
        }
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
                const muteBtn = entry.target.querySelector('.reel-mute-btn');
                if (video) {
                    if (entry.isIntersecting) {
                        // Reset video to beginning
                        video.currentTime = 0;
                        // Apply global mute state when video becomes visible
                        video.muted = isGlobalMuted;
                        if (muteBtn) {
                            muteBtn.dataset.muted = isGlobalMuted;
                            const icon = muteBtn.querySelector('i');
                            icon.className = isGlobalMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
                            muteBtn.title = isGlobalMuted ? 'Unmute' : 'Mute';
                        }
                        video.play().catch(err => console.log('Autoplay prevented:', err));
                    } else {
                        video.pause();
                    }
                }
            });
        }, options);

        // Expose observer setup for single items
        window.setupSingleItemObserver = (item) => {
            observer.observe(item);
        };

        document.querySelectorAll('.reel-item').forEach(item => {
            observer.observe(item);
        });
    }

    /**
     * Setup infinite scroll observer
     * Triggers fetch when user reaches 3rd to last item
     */
    function setupInfiniteScrollObserver() {
        if (isLoading || !hasMoreReels) return;

        const options = {
            root: reelsContainer,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Stop observing this item
                    observer.unobserve(entry.target);
                    // Fetch more reels
                    fetchReels(true);
                }
            });
        }, options);

        const reelItems = document.querySelectorAll('.reel-item');
        if (reelItems.length > 2) {
            // Observe the 3rd to last item, or last item if fewer
            const triggerIndex = Math.max(0, reelItems.length - 3);
            const triggerItem = reelItems[triggerIndex];
            observer.observe(triggerItem);
        } else if (reelItems.length > 0) {
            observer.observe(reelItems[reelItems.length - 1]);
        }
    }

    /**
     * Handle mute button click
     */
    function handleMuteClick(e) {
        e.stopPropagation();

        // Toggle global mute state
        isGlobalMuted = !isGlobalMuted;

        // Apply to ALL videos and buttons
        document.querySelectorAll('.reel-video').forEach(v => {
            v.muted = isGlobalMuted;
        });

        document.querySelectorAll('.reel-mute-btn').forEach(b => {
            b.dataset.muted = isGlobalMuted;
            const icon = b.querySelector('i');
            icon.className = isGlobalMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
            b.title = isGlobalMuted ? 'Unmute' : 'Mute';
        });
    }

    /**
     * Setup mute buttons for newly added items
     */
    function setupMuteButtonsForNewItems(allItems, startIndex) {
        // Initialize state
        for (let i = startIndex; i < allItems.length; i++) {
            const btn = allItems[i].querySelector('.reel-mute-btn');
            if (btn) {
                btn.dataset.muted = isGlobalMuted;
                const icon = btn.querySelector('i');
                icon.className = isGlobalMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
                btn.title = isGlobalMuted ? 'Unmute' : 'Mute';

                // Add listener
                btn.addEventListener('click', handleMuteClick);
            }

            // Video click listener
            const video = allItems[i].querySelector('.reel-video');
            if (video) {
                video.addEventListener('click', () => {
                    if (video.paused) video.play();
                    else video.pause();
                });
            }
        }
    }

    /**
     * Setup action buttons for newly added items
     */
    function setupActionButtonsForNewItems(allItems, startIndex) {
        for (let i = startIndex; i < allItems.length; i++) {
            const item = allItems[i];

            // Like buttons
            const likeBtn = item.querySelector('.like-btn');
            if (likeBtn) {
                likeBtn.addEventListener('click', () => {
                    likeBtn.classList.toggle('liked');
                    // TODO: API call
                });
            }

            // Comment buttons
            const commentBtn = item.querySelector('.comment-btn');
            if (commentBtn) {
                commentBtn.addEventListener('click', () => {
                    // TODO: Open comments
                });
            }
        }
    }

    /**
     * Setup mute/unmute buttons for videos (Initial load)
     */
    function setupMuteButtons() {
        // Initialize all mute buttons to show correct state
        document.querySelectorAll('.reel-mute-btn').forEach(btn => {
            btn.dataset.muted = isGlobalMuted;
            const icon = btn.querySelector('i');
            icon.className = isGlobalMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
            btn.title = isGlobalMuted ? 'Unmute' : 'Mute';
        });

        document.querySelectorAll('.reel-mute-btn').forEach(btn => {
            btn.removeEventListener('click', handleMuteClick);
            btn.addEventListener('click', handleMuteClick);
        });

        // Click video to pause/play
        document.querySelectorAll('.reel-video').forEach(video => {
            video.addEventListener('click', () => {
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
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
                const count = btn.querySelector('.reel-action-count');

                // Toggle like state (UI feedback)
                btn.classList.toggle('liked');

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

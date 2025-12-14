
// Auth Check
fetch('/api/auth/me')
    .then(res => {
        if (!res.ok) {
            throw new Error('Invalid token');
        }
        return res.json();
    })
    .then(user => {
        console.log(user);
        document.getElementById('sidebar-username').innerHTML = user.username + ((user.verificationStatus === 'Verified') ? `
                    <span class="verified-badge-small" title="Verified" style="margin-left: 4px;">
                        <svg aria-label="Verified" class="x1lliihq x1n2onr6" fill="rgb(0, 149, 246)" height="12" role="img" viewBox="0 0 40 40" width="12">
                            <title>Verified</title>
                            <path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fill-rule="evenodd"></path>
                        </svg>
                    </span>` : '');
        document.getElementById('sidebar-account-type').textContent = user.profileName || 'XYZ';

        // Set the profile link href
        const profileLink = document.getElementById('sidebar-profile-link');
        if (profileLink) {
            profileLink.href = '/' + user.username;
        }

        // Update profile pictures
        if (user.profilePictureUrl) {
            const largeProfilePic = document.querySelector('.profile-pic-large img');
            if (largeProfilePic) {
                largeProfilePic.src = user.profilePictureUrl;
            }

            const smallProfilePic = document.querySelector('.profile-icon-small img');
            if (smallProfilePic) {
                smallProfilePic.src = user.profilePictureUrl;
            }
        }
    })
    .catch(err => {
        console.error('Auth error:', err);
        localStorage.clear(); // Clear invalid cached data
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
// Stories Navigation - Arrow scroll functionality
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    const storiesContainer = document.getElementById('storiesContainer');
    const prevBtn = document.getElementById('storiesPrev');
    const nextBtn = document.getElementById('storiesNext');

    if (!storiesContainer || !prevBtn || !nextBtn) return;

    let isScrolling = false; // Prevent multiple clicks during animation

    // Get the width of a single story item (including gap)
    function getStoryItemWidth() {
        const storyItem = storiesContainer.querySelector('.story-item');
        if (!storyItem) return 93; // fallback: 77px + 16px gap
        const style = window.getComputedStyle(storiesContainer);
        const gap = parseInt(style.gap) || 16;
        return storyItem.offsetWidth + gap;
    }

    // Calculate how many hidden stories are in a direction
    function getHiddenStoriesCount(direction) {
        const storyWidth = getStoryItemWidth();
        const containerWidth = storiesContainer.offsetWidth;
        const scrollLeft = storiesContainer.scrollLeft;
        const maxScroll = storiesContainer.scrollWidth - containerWidth;

        if (direction === 'next') {
            const remainingScroll = maxScroll - scrollLeft;
            return Math.ceil(remainingScroll / storyWidth);
        } else {
            return Math.ceil(scrollLeft / storyWidth);
        }
    }

    // Update arrow visibility based on scroll position
    function updateArrowVisibility() {
        const scrollLeft = storiesContainer.scrollLeft;
        const maxScroll = storiesContainer.scrollWidth - storiesContainer.offsetWidth;

        // Show/hide prev arrow
        if (scrollLeft > 5) {
            prevBtn.classList.add('visible');
        } else {
            prevBtn.classList.remove('visible');
        }

        // Show/hide next arrow
        if (scrollLeft < maxScroll - 5) {
            nextBtn.classList.add('visible');
        } else {
            nextBtn.classList.remove('visible');
        }
    }

    // Easing function for smooth animation (ease-out cubic)
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // Animated scroll with visible motion
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

    // Scroll stories - moves 1-3 stories based on overflow with animation
    function scrollStories(direction) {
        if (isScrolling) return;

        const storyWidth = getStoryItemWidth();
        const hiddenCount = getHiddenStoriesCount(direction);

        // Move min(hiddenCount, 3) stories
        const storiesToMove = Math.min(Math.max(hiddenCount, 1), 3);
        const scrollAmount = storyWidth * storiesToMove;

        let targetScroll;
        if (direction === 'next') {
            targetScroll = storiesContainer.scrollLeft + scrollAmount;
        } else {
            targetScroll = storiesContainer.scrollLeft - scrollAmount;
        }

        // Clamp to valid scroll range
        const maxScroll = storiesContainer.scrollWidth - storiesContainer.offsetWidth;
        targetScroll = Math.max(0, Math.min(targetScroll, maxScroll));

        animateScroll(targetScroll, 400); // 400ms smooth animation
    }

    // Event listeners
    prevBtn.addEventListener('click', () => scrollStories('prev'));
    nextBtn.addEventListener('click', () => scrollStories('next'));

    // Update arrows on scroll (for manual scrolling)
    storiesContainer.addEventListener('scroll', () => {
        if (!isScrolling) {
            updateArrowVisibility();
        }
    });

    // Initial check and on resize
    updateArrowVisibility();
    window.addEventListener('resize', updateArrowVisibility);
});
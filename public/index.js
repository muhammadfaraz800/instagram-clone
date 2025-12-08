
// Auth Check
fetch('/api/auth/me')
    .then(res => {
        if (!res.ok) {
            throw new Error('Invalid token');
        }
        return res.json();
    })
    .then(user => {
        document.getElementById('sidebar-username').textContent = user.username;
        document.getElementById('sidebar-account-type').textContent = user.accountType || 'Normal Account';

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
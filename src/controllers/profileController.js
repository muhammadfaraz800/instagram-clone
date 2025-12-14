/**
 * Profile Controller
 * Handles profile data, posts, and follow/unfollow functionality
 */
import { getPool } from '../config/db.js';

/**
 * Get user profile data
 * GET /api/profile/:username
 * Returns profile data for a specific user for profile page
 */
export const getProfile = async (req, res) => {
    const { username } = req.params;

    // Validate username parameter
    if (!username || typeof username !== 'string' || username.trim() === '') {
        return res.status(400).json({ error: 'Invalid username parameter' });
    }

    let connection;

    try {
        connection = await getPool().getConnection();

        // Fetch user profile data
        // Fetch user profile data + counts of posts, followers, and following
        const profileResult = await connection.execute(
            `SELECT 
                a.UserName,
                a.Profile_Name,
                a.Profile_Picture_URL,
                a.Bio,
                a.Email,
                a.Visibility,
                b.Bio_URL AS Website,
                b.ContactNo,
                b.Business_Type,
                v.Status AS Verification_Status,
                -- Count total content (Reels + Images)
                (SELECT COUNT(*) FROM Content c WHERE c.UserName = a.UserName) AS Posts_Count,
                -- Count how many people follow THIS user
                (SELECT COUNT(*) FROM Follows f WHERE f.FollowedUserName = a.UserName) AS Followers_Count,
                -- Count how many people THIS user follows
                (SELECT COUNT(*) FROM Follows f WHERE f.FollowerUserName = a.UserName) AS Following_Count
            FROM Account a
            LEFT JOIN Business b ON a.UserName = b.UserName
            LEFT JOIN Verification v ON a.UserName = v.UserName
            WHERE LOWER(a.UserName) = LOWER(:username)`,
            { username },
            { outFormat: 4002 }
        );

        if (!profileResult.rows || profileResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = profileResult.rows[0];

        //send everything to frontend
        res.json({
            username: user.USERNAME,
            profileName: user.PROFILE_NAME,
            profilePictureUrl: user.PROFILE_PICTURE_URL || '/uploads/default/default-avatar.png',
            bio: user.BIO,
            visibility: user.VISIBILITY,
            website: user.WEBSITE,
            contactNo: user.CONTACTNO,
            businessType: user.BUSINESS_TYPE,
            followersCount: user.FOLLOWERS_COUNT || 0,
            followingCount: user.FOLLOWING_COUNT || 0,
            postsCount: user.POSTS_COUNT || 0,
            isVerified: user.VERIFICATION_STATUS === 'Verified',
            verificationStatus: user.VERIFICATION_STATUS // 'Pending', 'Verified', 'Rejected', or null
        });

    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
};

/**
 * Get user posts
 * GET /api/profile/:username/posts
 * Query params: type = 'all' | 'reel' | 'image'
 */
export const getProfilePosts = async (req, res) => {
    const { username } = req.params;
    const { type = 'image' } = req.query; // Default to 'image' if not specified
    const currentUser = req.username; // From verifyToken middleware

    // Validate username parameter
    if (!username || typeof username !== 'string' || username.trim() === '') {
        return res.status(400).json({ error: 'Invalid username parameter' });
    }

    let connection;

    try {
        connection = await getPool().getConnection();

        // First check if the profile exists and get visibility
        const profileResult = await connection.execute(
            `SELECT Visibility FROM Account WHERE LOWER(UserName) = LOWER(:username)`,
            { username },
            { outFormat: 4002 }
        );

        if (!profileResult.rows || profileResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const visibility = profileResult.rows[0].VISIBILITY;

        // Safely check if viewing own profile (currentUser may be undefined if not authenticated)
        const isOwnProfile = currentUser && currentUser.toLowerCase() === username.toLowerCase();

        // Default to not fetching (block access) if logic doesn't allow
        let shouldFetch = false;

        if (isOwnProfile) {
            shouldFetch = true;
        } else if (visibility === 'Public') {
            // Even if not following, public profiles are visible
            shouldFetch = true;
        } else if (visibility === 'Private') {
            // Check if current user follows this private account
            if (currentUser) {
                const followResult = await connection.execute(
                    `SELECT 1 FROM Follows 
                     WHERE LOWER(FollowerUserName) = LOWER(:currentUser) 
                     AND LOWER(FollowedUserName) = LOWER(:username)`,
                    { currentUser, username },
                    { outFormat: 4002 }
                );
                if (followResult.rows && followResult.rows.length > 0) {
                    shouldFetch = true;
                }
            }
        }

        if (!shouldFetch) {
            return res.json([]); // Return empty array for denied access
        }

        // Execute the specific query based on type
        let postsResult;

        if (type === 'reel') {
            // Reels Query
            const reelQuery = `
                SELECT 
                    c.ContentID,
                    c.Path,             -- The video URL
                    c.Caption,
                    r.ReelDuration,     -- Specific to Reels
                    c.Post_Date,        -- Using verified Post_Date column
                    -- Like Count
                    (SELECT COUNT(*) FROM Likes l 
                     JOIN Action act ON l.ActionID = act.ActionID 
                     WHERE act.ContentID = c.ContentID) AS Like_Count,
                    -- Comment Count
                    (SELECT COUNT(*) FROM Comments com 
                     JOIN Action act ON com.ActionID = act.ActionID 
                     WHERE act.ContentID = c.ContentID) AS Comment_Count,
                    -- Tags
                    (SELECT LISTAGG(t.TagName, ',') WITHIN GROUP (ORDER BY t.TagName)
                     FROM Content_Tag ct
                     JOIN Tags t ON ct.TagID = t.TagID
                     WHERE ct.ContentID = c.ContentID) AS Tags
                
                FROM Content c
                JOIN Reel r ON c.ContentID = r.ContentID   -- INNER JOIN enforces "Only Reels"
                WHERE LOWER(c.UserName) = LOWER(:username)
                ORDER BY c.Post_Date DESC
            `;
            postsResult = await connection.execute(reelQuery, { username }, { outFormat: 4002 });

        } else {
            // Images (Posts) Query - Default
            const imageQuery = `
                SELECT 
                    c.ContentID,
                    c.Path,             -- The image URL
                    c.Caption,
                    c.Post_Date,        -- Using verified Post_Date column
                    -- Like Count
                    (SELECT COUNT(*) FROM Likes l 
                     JOIN Action act ON l.ActionID = act.ActionID 
                     WHERE act.ContentID = c.ContentID) AS Like_Count,
                    -- Comment Count
                    (SELECT COUNT(*) FROM Comments com 
                     JOIN Action act ON com.ActionID = act.ActionID 
                     WHERE act.ContentID = c.ContentID) AS Comment_Count,
                    -- Tags
                    (SELECT LISTAGG(t.TagName, ',') WITHIN GROUP (ORDER BY t.TagName)
                     FROM Content_Tag ct
                     JOIN Tags t ON ct.TagID = t.TagID
                     WHERE ct.ContentID = c.ContentID) AS Tags
                
                FROM Content c
                JOIN Image i ON c.ContentID = i.ContentID  -- INNER JOIN enforces "Only Images"
                WHERE LOWER(c.UserName) = LOWER(:username)
                ORDER BY c.Post_Date DESC
            `;
            postsResult = await connection.execute(imageQuery, { username }, { outFormat: 4002 });
        }


        const posts = (postsResult.rows || []).map(row => ({
            contentId: row.CONTENTID,
            caption: row.CAPTION,
            path: row.PATH, // "mediaUrl" in frontend logic
            mediaUrl: row.PATH, // Explicitly mapping to mediaUrl as well for frontend compatibility if needed
            mediaType: type === 'reel' ? 'reel' : 'image',
            createdAt: row.POST_DATE,
            duration: row.REELDURATION || null,
            likesCount: row.LIKE_COUNT || 0,
            commentsCount: row.COMMENT_COUNT || 0,
            tags: row.TAGS ? row.TAGS.split(',') : []
        }));

        res.json(posts);

    } catch (error) {
        console.error('Error fetching posts detailed:', error);
        res.status(500).json({ error: 'Failed to fetch posts', details: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
};

/**
 * Follow a user
 * POST /api/profile/:username/follow
 * For public accounts: inserts directly into Follows table
 * For private accounts: inserts into Requests table with 'Pending' status
 */
export const followUser = async (req, res) => {
    const { username } = req.params;
    const currentUser = req.username; // From verifyToken middleware

    // Validate username parameter
    if (!username || typeof username !== 'string' || username.trim() === '') {
        return res.status(400).json({ error: 'Invalid username parameter' });
    }

    let connection;

    // Cannot follow yourself
    if (currentUser.toLowerCase() === username.toLowerCase()) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    try {
        connection = await getPool().getConnection();

        // Check if target user exists and get their visibility
        const userResult = await connection.execute(
            `SELECT UserName, Visibility FROM Account WHERE LOWER(UserName) = LOWER(:username)`,
            { username },
            { outFormat: 4002 }
        );

        if (!userResult.rows || userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const targetUser = userResult.rows[0];
        const targetUsername = targetUser.USERNAME;
        const isPrivate = targetUser.VISIBILITY === 'Private';

        // Check if already following
        const existingFollow = await connection.execute(
            `SELECT 1 FROM Follows 
             WHERE LOWER(FollowerUserName) = LOWER(:currentUser) 
             AND LOWER(FollowedUserName) = LOWER(:targetUsername)`,
            { currentUser, targetUsername },
            { outFormat: 4002 }
        );

        if (existingFollow.rows && existingFollow.rows.length > 0) {
            return res.status(400).json({ error: 'Already following this user' });
        }

        // Check if there's already a pending request (row exists = pending)
        const existingRequest = await connection.execute(
            `SELECT 1 FROM Requests 
             WHERE LOWER(SenderUserName) = LOWER(:currentUser) 
             AND LOWER(ReceiverUserName) = LOWER(:targetUsername)`,
            { currentUser, targetUsername },
            { outFormat: 4002 }
        );

        if (existingRequest.rows && existingRequest.rows.length > 0) {
            return res.status(400).json({ error: 'Follow request already pending' });
        }

        if (isPrivate) {
            // Private account - insert into Requests table
            await connection.execute(
                `INSERT INTO Requests (SenderUserName, ReceiverUserName) 
                 VALUES (:currentUser, :targetUsername)`,
                { currentUser, targetUsername },
                { autoCommit: true }
            );
            res.json({ requested: true, message: 'Follow request sent' });
        } else {
            // Public account - insert directly into Follows table
            await connection.execute(
                `INSERT INTO Follows (FollowerUserName, FollowedUserName) 
                 VALUES (:currentUser, :targetUsername)`,
                { currentUser, targetUsername },
                { autoCommit: true }
            );
            res.json({ followed: true, message: 'Followed successfully' });
        }

    } catch (error) {
        // Handle duplicate key errors
        if (error.errorNum === 1) {
            return res.status(400).json({ error: 'Already following this user or request pending' });
        }
        console.error('Error following user:', error);
        res.status(500).json({ error: 'Failed to follow user', details: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
};

/**
 * Unfollow a user or cancel a pending follow request
 * DELETE /api/profile/:username/follow
 */
export const unfollowUser = async (req, res) => {
    const { username } = req.params;
    const currentUser = req.username; // From verifyToken middleware

    // Validate username parameter
    if (!username || typeof username !== 'string' || username.trim() === '') {
        return res.status(400).json({ error: 'Invalid username parameter' });
    }

    let connection;

    try {
        connection = await getPool().getConnection();

        // Try to delete from Follows table first
        const followResult = await connection.execute(
            `DELETE FROM Follows 
             WHERE LOWER(FollowerUserName) = LOWER(:currentUser) 
             AND LOWER(FollowedUserName) = LOWER(:username)`,
            { currentUser, username },
            { autoCommit: true }
        );

        if (followResult.rowsAffected > 0) {
            return res.json({ unfollowed: true, message: 'Unfollowed successfully' });
        }

        // If not following, try to delete pending request (row exists = pending)
        const requestResult = await connection.execute(
            `DELETE FROM Requests 
             WHERE LOWER(SenderUserName) = LOWER(:currentUser) 
             AND LOWER(ReceiverUserName) = LOWER(:username)`,
            { currentUser, username },
            { autoCommit: true }
        );

        if (requestResult.rowsAffected > 0) {
            return res.json({ cancelled: true, message: 'Follow request cancelled' });
        }

        res.status(400).json({ error: 'Not following this user and no pending request' });

    } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(500).json({ error: 'Failed to unfollow user', details: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
};

/**
 * Get follow status between current user and target user
 * GET /api/profile/:username/follow-status
 * Returns: isFollowing, isPending, isOwnProfile
 */
export const getFollowStatus = async (req, res) => {
    const { username } = req.params;
    const currentUser = req.username; // From verifyToken middleware

    // Validate username parameter
    if (!username || typeof username !== 'string' || username.trim() === '') {
        return res.status(400).json({ error: 'Invalid username parameter' });
    }

    let connection;

    // Check if viewing own profile
    if (currentUser.toLowerCase() === username.toLowerCase()) {
        return res.json({ isFollowing: false, isPending: false, isOwnProfile: true });
    }

    try {
        connection = await getPool().getConnection();

        // Check if following
        const followResult = await connection.execute(
            `SELECT 1 FROM Follows 
             WHERE LOWER(FollowerUserName) = LOWER(:currentUser) 
             AND LOWER(FollowedUserName) = LOWER(:username)`,
            { currentUser, username },
            { outFormat: 4002 }
        );

        const isFollowing = followResult.rows && followResult.rows.length > 0;

        // If not following, check for pending request
        let isPending = false;
        if (!isFollowing) {
            const requestResult = await connection.execute(
                `SELECT 1 FROM Requests 
                 WHERE LOWER(SenderUserName) = LOWER(:currentUser) 
                 AND LOWER(ReceiverUserName) = LOWER(:username)`,
                { currentUser, username },
                { outFormat: 4002 }
            );
            isPending = requestResult.rows && requestResult.rows.length > 0;
        }

        res.json({ isFollowing, isPending, isOwnProfile: false });

    } catch (error) {
        console.error('Error checking follow status:', error);
        res.status(500).json({ error: 'Failed to check follow status', details: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
};

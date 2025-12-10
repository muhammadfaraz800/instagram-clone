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
                -- Count total content (Reels + Images)
                (SELECT COUNT(*) FROM Content c WHERE c.UserName = a.UserName) AS Posts_Count,
                -- Count how many people follow THIS user
                (SELECT COUNT(*) FROM Follows f WHERE f.FollowedUserName = a.UserName) AS Followers_Count,
                -- Count how many people THIS user follows
                (SELECT COUNT(*) FROM Follows f WHERE f.FollowerUserName = a.UserName) AS Following_Count
            FROM Account a
            LEFT JOIN Business b ON a.UserName = b.UserName
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
            postsCount: user.POSTS_COUNT || 0
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
    const { type = 'all' } = req.query;
    const currentUser = req.username; // From verifyToken middleware
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
        const isOwnProfile = currentUser.toLowerCase() === username.toLowerCase();

        // Check if profile is private and user is not following
        if (visibility === 'Private' && !isOwnProfile) {
            // TODO: Check follow status when Follows table exists
            /*
            const followResult = await connection.execute(
                `SELECT 1 FROM Follows 
                 WHERE LOWER(FollowerUsername) = LOWER(:currentUser) 
                 AND LOWER(FollowingUsername) = LOWER(:username)`,
                { currentUser, username },
                { outFormat: 4002 }
            );
            
            if (!followResult.rows || followResult.rows.length === 0) {
                return res.json([]); // Return empty array for private profile
            }
            */
            // For now, return empty for private profiles (placeholder)
            return res.json([]);
        }

        // TODO: Fetch posts when Posts table exists
        // Placeholder response - return empty array
        /*
        let query = `SELECT PostId, MediaURL, MediaType, Caption, CreatedAt 
                     FROM Posts WHERE LOWER(Username) = LOWER(:username)`;
        
        if (type === 'reel') {
            query += ` AND MediaType = 'reel'`;
        } else if (type === 'image') {
            query += ` AND MediaType = 'image'`;
        }
        
        query += ` ORDER BY CreatedAt DESC`;
        
        const postsResult = await connection.execute(query, { username }, { outFormat: 4002 });
        
        const posts = postsResult.rows.map(row => ({
            postId: row.POSTID,
            mediaUrl: row.MEDIAURL,
            mediaType: row.MEDIATYPE,
            caption: row.CAPTION,
            createdAt: row.CREATEDAT,
            likesCount: 0,  // TODO: implement likes count
            commentsCount: 0 // TODO: implement comments count
        }));
        
        res.json(posts);
        */

        // Return empty array as placeholder
        res.json([]);

    } catch (error) {
        console.error('Error fetching posts:', error);
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
 */
export const followUser = async (req, res) => {
    const { username } = req.params;
    const currentUser = req.username; // From verifyToken middleware
    let connection;

    // Cannot follow yourself
    if (currentUser.toLowerCase() === username.toLowerCase()) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    try {
        connection = await getPool().getConnection();

        // Check if target user exists
        const userResult = await connection.execute(
            `SELECT UserName FROM Account WHERE LOWER(UserName) = LOWER(:username)`,
            { username },
            { outFormat: 4002 }
        );

        if (!userResult.rows || userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // TODO: Insert follow relationship when Follows table exists
        /*
        await connection.execute(
            `INSERT INTO Follows (FollowerUsername, FollowingUsername) 
             VALUES (:currentUser, :username)`,
            { currentUser, username },
            { autoCommit: true }
        );
        */

        res.json({ message: 'Followed successfully' });

    } catch (error) {
        // Handle duplicate follow (already following)
        if (error.errorNum === 1) {
            return res.status(400).json({ error: 'Already following this user' });
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
 * Unfollow a user
 * DELETE /api/profile/:username/follow
 */
export const unfollowUser = async (req, res) => {
    const { username } = req.params;
    const currentUser = req.username; // From verifyToken middleware
    let connection;

    try {
        connection = await getPool().getConnection();

        // TODO: Delete follow relationship when Follows table exists
        /*
        const result = await connection.execute(
            `DELETE FROM Follows 
             WHERE LOWER(FollowerUsername) = LOWER(:currentUser) 
             AND LOWER(FollowingUsername) = LOWER(:username)`,
            { currentUser, username },
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(400).json({ error: 'Not following this user' });
        }
        */

        res.json({ message: 'Unfollowed successfully' });

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
 * Get follow status
 * GET /api/profile/:username/follow-status
 */
export const getFollowStatus = async (req, res) => {
    const { username } = req.params;
    const currentUser = req.username; // From verifyToken middleware
    let connection;

    // Check if viewing own profile
    if (currentUser.toLowerCase() === username.toLowerCase()) {
        return res.json({ isFollowing: false, isOwnProfile: true });
    }

    try {
        connection = await getPool().getConnection();

        // TODO: Check follow status when Follows table exists
        /*
        const result = await connection.execute(
            `SELECT 1 FROM Follows 
             WHERE LOWER(FollowerUsername) = LOWER(:currentUser) 
             AND LOWER(FollowingUsername) = LOWER(:username)`,
            { currentUser, username },
            { outFormat: 4002 }
        );

        const isFollowing = result.rows && result.rows.length > 0;
        */

        // Placeholder - always return not following
        const isFollowing = false;

        res.json({ isFollowing, isOwnProfile: false });

    } catch (error) {
        console.error('Error checking follow status:', error);
        res.status(500).json({ error: 'Failed to check follow status', details: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
};

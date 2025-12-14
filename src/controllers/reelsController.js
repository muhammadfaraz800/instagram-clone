import { getPool } from '../config/db.js';
import { DEFAULT_AVATAR_PATH } from '../utils/constants.js';

/**
 * Get reels feed for the reels page
 * Fetches public reels and reels from private accounts the user follows
 */
export const getReelsFeed = async (req, res) => {
    const currentUser = req.username;
    let connection;

    try {
        connection = await getPool().getConnection();

        const result = await connection.execute(
            `SELECT * FROM (
                SELECT 
                    c.ContentID,
                    c.Path,
                    c.Caption,
                    c.UserName AS Author,
                    a.Profile_Picture_URL,
                    r.ReelDuration,
                    v.Status AS Author_Verification_Status,
                    
                    (SELECT LISTAGG(t.TagName, ', ') WITHIN GROUP (ORDER BY t.TagName)
                     FROM Content_Tag ct
                     JOIN Tags t ON ct.TagID = t.TagID
                     WHERE ct.ContentID = c.ContentID) AS Tags,
                     
                    (SELECT COUNT(*) FROM Likes l 
                    JOIN Action act ON l.ActionID = act.ActionID 
                    WHERE act.ContentID = c.ContentID) AS Like_Count,
                    
                    (SELECT COUNT(*) FROM Comments com 
                    JOIN Action act ON com.ActionID = act.ActionID 
                    WHERE act.ContentID = c.ContentID) AS Comment_Count
                    
                FROM Content c
                JOIN Reel r ON c.ContentID = r.ContentID
                JOIN Account a ON c.UserName = a.UserName
                LEFT JOIN Verification v ON a.UserName = v.UserName
                
                WHERE 
                    c.UserName <> :current_user
                    AND (
                        a.Visibility = 'Public'
                        OR EXISTS (
                            SELECT 1 FROM Follows f 
                            WHERE f.Follower = :current_user 
                            AND f.Following = c.UserName
                        )
                    )
                ORDER BY c.Post_Date DESC
                FETCH FIRST 50 ROWS ONLY
            )
            ORDER BY DBMS_RANDOM.VALUE
            FETCH FIRST 10 ROWS ONLY`,
            { current_user: currentUser },
            { outFormat: 4002 }
        );

        const reels = result.rows.map(row => ({
            contentId: row.CONTENTID,
            path: row.PATH,
            caption: row.CAPTION,
            author: row.AUTHOR,
            profilePictureUrl: row.PROFILE_PICTURE_URL || DEFAULT_AVATAR_PATH,
            reelDuration: row.REELDURATION,
            verificationStatus: row.AUTHOR_VERIFICATION_STATUS,
            tags: row.TAGS ? row.TAGS.split(', ') : [],
            likeCount: row.LIKE_COUNT || 0,
            commentCount: row.COMMENT_COUNT || 0
        }));

        res.json(reels);

    } catch (err) {
        console.error('Error fetching reels feed:', err);
        res.status(500).json({ message: 'Error fetching reels' });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};

/**
 * Get a specific reel by ID
 */
export const getReelById = async (req, res) => {
    const { contentId } = req.params;
    const currentUser = req.username;
    let connection;

    try {
        connection = await getPool().getConnection();

        const result = await connection.execute(
            `SELECT 
                c.ContentID,
                c.Path,
                c.Caption,
                c.UserName AS Author,
                a.Profile_Picture_URL,
                a.Visibility,
                r.ReelDuration,
                v.Status AS Author_Verification_Status,
                
                (SELECT LISTAGG(t.TagName, ', ') WITHIN GROUP (ORDER BY t.TagName)
                 FROM Content_Tag ct
                 JOIN Tags t ON ct.TagID = t.TagID
                 WHERE ct.ContentID = c.ContentID) AS Tags,
                 
                (SELECT COUNT(*) FROM Likes l 
                JOIN Action act ON l.ActionID = act.ActionID 
                WHERE act.ContentID = c.ContentID) AS Like_Count,
                
                (SELECT COUNT(*) FROM Comments com 
                JOIN Action act ON com.ActionID = act.ActionID 
                WHERE act.ContentID = c.ContentID) AS Comment_Count

            FROM Content c
            JOIN Reel r ON c.ContentID = r.ContentID
            JOIN Account a ON c.UserName = a.UserName
            LEFT JOIN Verification v ON a.UserName = v.UserName
            WHERE c.ContentID = :contentId`,
            { contentId },
            { outFormat: 4002 }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Reel not found' });
        }

        const row = result.rows[0];

        // Check if user can view this reel (public or following private account)
        if (row.VISIBILITY === 'Private' && row.AUTHOR !== currentUser) {
            const followCheck = await connection.execute(
                `SELECT 1 FROM Follows WHERE Follower = :currentUser AND Following = :author`,
                { currentUser, author: row.AUTHOR },
                { outFormat: 4002 }
            );

            if (followCheck.rows.length === 0) {
                return res.status(403).json({ message: 'This reel is from a private account' });
            }
        }

        const reel = {
            contentId: row.CONTENTID,
            path: row.PATH,
            caption: row.CAPTION,
            author: row.AUTHOR,
            profilePictureUrl: row.PROFILE_PICTURE_URL || DEFAULT_AVATAR_PATH,
            reelDuration: row.REELDURATION,
            verificationStatus: row.AUTHOR_VERIFICATION_STATUS,
            tags: row.TAGS ? row.TAGS.split(', ') : [],
            likeCount: row.LIKE_COUNT || 0,
            commentCount: row.COMMENT_COUNT || 0
        };

        res.json(reel);

    } catch (err) {
        console.error('Error fetching reel:', err);
        res.status(500).json({ message: 'Error fetching reel' });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};

/**
 * Get likes for a reel
 */
export const getReelLikes = async (req, res) => {
    const { contentId } = req.params;
    let connection;

    try {
        connection = await getPool().getConnection();

        const result = await connection.execute(
            `SELECT 
                a.UserName,
                a.Profile_Name,
                a.Profile_Picture_URL,
                v.Status AS Verification_Status
                
            FROM Likes l
            JOIN Action act ON l.ActionID = act.ActionID
            JOIN Account a ON act.UserName = a.UserName
            LEFT JOIN Verification v ON a.UserName = v.UserName

            WHERE 
                act.ContentID = :contentId
                
            ORDER BY 
                CASE WHEN v.Status = 'Verified' THEN 1 ELSE 2 END,
                act.ActionDate DESC`,
            { contentId },
            { outFormat: 4002 }
        );

        const likes = result.rows.map(row => ({
            username: row.USERNAME,
            profileName: row.PROFILE_NAME,
            profilePictureUrl: row.PROFILE_PICTURE_URL || DEFAULT_AVATAR_PATH,
            verificationStatus: row.VERIFICATION_STATUS
        }));

        res.json(likes);

    } catch (err) {
        console.error('Error fetching reel likes:', err);
        res.status(500).json({ message: 'Error fetching likes' });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};

/**
 * Get comments for a reel
 */
export const getReelComments = async (req, res) => {
    const { contentId } = req.params;
    let connection;

    try {
        connection = await getPool().getConnection();

        const result = await connection.execute(
            `SELECT 
                com.CommentText,
                act.ActionDate,
                a.UserName,
                a.Profile_Picture_URL,
                v.Status AS Verification_Status,
                
                (SELECT COUNT(*) 
                 FROM Comment_Like cl 
                 WHERE cl.Liked_Comment_ID = com.ActionID) AS Comment_Like_Count

            FROM Comments com
            JOIN Action act ON com.ActionID = act.ActionID
            JOIN Account a ON act.UserName = a.UserName
            LEFT JOIN Verification v ON a.UserName = v.UserName

            WHERE 
                act.ContentID = :contentId
                
            ORDER BY 
                CASE WHEN v.Status = 'Verified' THEN 1 ELSE 2 END,
                Comment_Like_Count DESC,
                act.ActionDate DESC`,
            { contentId },
            { outFormat: 4002 }
        );

        const comments = result.rows.map(row => ({
            commentText: row.COMMENTTEXT,
            actionDate: row.ACTIONDATE,
            username: row.USERNAME,
            profilePictureUrl: row.PROFILE_PICTURE_URL || DEFAULT_AVATAR_PATH,
            verificationStatus: row.VERIFICATION_STATUS,
            likeCount: row.COMMENT_LIKE_COUNT || 0
        }));

        res.json(comments);

    } catch (err) {
        console.error('Error fetching reel comments:', err);
        res.status(500).json({ message: 'Error fetching comments' });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
};

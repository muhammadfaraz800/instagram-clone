/**
 * Feed Controller
 * Handles home feed, post details, comments, and suggestions for the home page
 */

import { getPool } from '../config/db.js';
import { DEFAULT_AVATAR_PATH } from '../utils/constants.js';

// ==================== HOME FEED ====================

/**
 * Get home feed posts
 * GET /api/feed
 * Query params: offset, seed, limit
 */
export async function getHomeFeed(req, res) {
    const pool = await getPool();
    let connection;

    try {
        const currentUser = req.username;
        const offset = parseInt(req.query.offset) || 0;
        const limit = parseInt(req.query.limit) || 10;
        const seed = req.query.seed || Date.now().toString();

        connection = await pool.getConnection();

        const result = await connection.execute(
            `SELECT 
                c.ContentID,
                c.Path,
                c.Caption,
                c.Post_Date,
                c.UserName,
                CASE 
                    WHEN r.ContentID IS NOT NULL THEN 'Reel'
                    WHEN i.ContentID IS NOT NULL THEN 'Image'
                    ELSE 'Unknown'
                END AS Content_Type,
                r.ReelDuration,
                a.Profile_Name,
                a.Profile_Picture_URL,
                v.Status AS Verification_Status,
                (SELECT COUNT(*) FROM Likes l JOIN Action act ON l.ActionID = act.ActionID WHERE act.ContentID = c.ContentID) AS Total_Likes,
                (SELECT COUNT(*) FROM Comments com JOIN Action act ON com.ActionID = act.ActionID WHERE act.ContentID = c.ContentID) AS Total_Comments
            FROM Content c
            LEFT JOIN Reel r ON c.ContentID = r.ContentID
            LEFT JOIN Image i ON c.ContentID = i.ContentID
            JOIN Account a ON c.UserName = a.UserName
            LEFT JOIN Verification v ON a.UserName = v.UserName
            WHERE c.UserName <> :current_user
            ORDER BY ORA_HASH(c.ContentID || :seed_value)
            OFFSET :offset_value ROWS FETCH NEXT :limit_value ROWS ONLY`,
            {
                current_user: currentUser,
                seed_value: seed,
                offset_value: offset,
                limit_value: limit
            }
        );

        const posts = result.rows.map(row => ({
            contentId: row[0],
            path: row[1] || '',
            caption: row[2] || '',
            postDate: row[3],
            username: row[4],
            contentType: row[5],
            reelDuration: row[6] || null,
            profileName: row[7] || row[4],
            profilePictureUrl: row[8] || DEFAULT_AVATAR_PATH,
            verificationStatus: row[9] || null,
            totalLikes: row[10] || 0,
            totalComments: row[11] || 0
        }));

        res.json({
            success: true,
            posts,
            hasMore: posts.length === limit,
            nextOffset: offset + posts.length
        });

    } catch (error) {
        console.error('Error fetching home feed:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch feed', error: error.message });
    } finally {
        if (connection) await connection.close();
    }
}

// ==================== POST DETAILS ====================

/**
 * Get post details
 * GET /api/feed/post/:contentId
 */
export async function getPostDetails(req, res) {
    const pool = await getPool();
    let connection;

    try {
        const { contentId } = req.params;
        connection = await pool.getConnection();

        // Exact query from user
        const result = await connection.execute(
            `SELECT 
                c.ContentID,
                c.Path,
                c.Caption,
                c.Post_Date,
                a.UserName,
                a.Profile_Name,
                a.Profile_Picture_URL,
                v.Status AS Author_Verification,
                CASE 
                    WHEN r.ContentID IS NOT NULL THEN 'Reel'
                    WHEN i.ContentID IS NOT NULL THEN 'Image'
                    ELSE 'Unknown'
                END AS Content_Type,
                r.ReelDuration,
                (SELECT COUNT(*) FROM Likes l 
                 JOIN Action act ON l.ActionID = act.ActionID 
                 WHERE act.ContentID = c.ContentID) AS Total_Likes,
                (SELECT COUNT(*) FROM Comments com 
                 JOIN Action act ON com.ActionID = act.ActionID 
                 WHERE act.ContentID = c.ContentID) AS Total_Comments
            FROM Content c
            JOIN Account a ON c.UserName = a.UserName
            LEFT JOIN Verification v ON a.UserName = v.UserName
            LEFT JOIN Reel r ON c.ContentID = r.ContentID
            LEFT JOIN Image i ON c.ContentID = i.ContentID
            WHERE c.ContentID = :clicked_post_id`,
            { clicked_post_id: contentId }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        const row = result.rows[0];
        const post = {
            contentId: row[0],
            path: row[1] || '',
            caption: row[2] || '',
            postDate: row[3],
            username: row[4],
            profileName: row[5] || row[4],
            profilePictureUrl: row[6] || DEFAULT_AVATAR_PATH,
            verificationStatus: row[7] || null,
            contentType: row[8],
            reelDuration: row[9] || null,
            totalLikes: row[10] || 0,
            totalComments: row[11] || 0
        };

        res.json({ success: true, post });

    } catch (error) {
        console.error('Error fetching post details:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch post details', error: error.message });
    } finally {
        if (connection) await connection.close();
    }
}

// ==================== POST COMMENTS ====================

/**
 * Get post comments
 * GET /api/feed/post/:contentId/comments
 */
export async function getPostComments(req, res) {
    const pool = await getPool();
    let connection;

    try {
        const { contentId } = req.params;
        connection = await pool.getConnection();

        // Exact query from user
        const result = await connection.execute(
            `SELECT 
                com.ActionID AS Comment_ID,
                com.CommentText,
                act.ActionDate AS Comment_Date,
                a.UserName,
                a.Profile_Picture_URL,
                v.Status AS Verification_Status,
                (SELECT COUNT(*) 
                 FROM Comment_Like cl 
                 WHERE cl.Liked_Comment_ID = com.ActionID) AS Comment_Likes_Count,
                (SELECT COUNT(*) 
                 FROM Comments reply 
                 WHERE reply.ParentCommentID = com.ActionID) AS Reply_Count
            FROM Comments com
            JOIN Action act ON com.ActionID = act.ActionID
            JOIN Account a ON act.UserName = a.UserName
            LEFT JOIN Verification v ON a.UserName = v.UserName
            WHERE 
                act.ContentID = :clicked_post_id
                AND com.ParentCommentID IS NULL
            ORDER BY 
                Comment_Likes_Count DESC,
                act.ActionDate DESC`,
            { clicked_post_id: contentId }
        );

        const comments = result.rows.map(row => ({
            commentId: row[0],
            commentText: row[1],
            commentDate: row[2],
            username: row[3],
            profilePictureUrl: row[4] || DEFAULT_AVATAR_PATH,
            verificationStatus: row[5] || null,
            likesCount: row[6] || 0,
            replyCount: row[7] || 0
        }));

        res.json({ success: true, comments });

    } catch (error) {
        console.error('Error fetching post comments:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch comments', error: error.message });
    } finally {
        if (connection) await connection.close();
    }
}

// ==================== COMMENT REPLIES ====================

/**
 * Get comment replies
 * GET /api/feed/comment/:commentId/replies
 */
export async function getCommentReplies(req, res) {
    const pool = await getPool();
    let connection;

    try {
        const { commentId } = req.params;
        connection = await pool.getConnection();

        // Exact query from user
        const result = await connection.execute(
            `SELECT 
                reply.ActionID AS Reply_ID,
                reply.CommentText,
                act.ActionDate AS Reply_Date,
                a.UserName,
                a.Profile_Picture_URL,
                v.Status AS Verification_Status,
                (SELECT COUNT(*) FROM Comment_Like cl WHERE cl.Liked_Comment_ID = reply.ActionID) AS Reply_Likes_Count
            FROM Comments reply
            JOIN Action act ON reply.ActionID = act.ActionID
            JOIN Account a ON act.UserName = a.UserName
            LEFT JOIN Verification v ON a.UserName = v.UserName
            WHERE 
                reply.ParentCommentID = :parent_comment_id
            ORDER BY act.ActionDate ASC`,
            { parent_comment_id: commentId }
        );

        const replies = result.rows.map(row => ({
            replyId: row[0],
            commentText: row[1],
            replyDate: row[2],
            username: row[3],
            profilePictureUrl: row[4] || DEFAULT_AVATAR_PATH,
            verificationStatus: row[5] || null,
            likesCount: row[6] || 0
        }));

        res.json({ success: true, replies });

    } catch (error) {
        console.error('Error fetching comment replies:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch replies', error: error.message });
    } finally {
        if (connection) await connection.close();
    }
}

// ==================== SUGGESTIONS ====================

/**
 * Get user suggestions (friend of friend algorithm)
 * GET /api/feed/suggestions
 */
export async function getSuggestions(req, res) {
    const pool = await getPool();
    let connection;

    try {
        const currentUser = req.username;
        connection = await pool.getConnection();

        // Exact query from user
        const result = await connection.execute(
            `SELECT DISTINCT
                suggested.UserName,
                suggested.Profile_Name,
                suggested.Profile_Picture_URL,
                v.Status AS Verification_Status,
                (SELECT 'Followed by ' || f_bridge.FollowerUserName
                 FROM Follows f_bridge
                 WHERE f_bridge.FollowedUserName = suggested.UserName 
                   AND f_bridge.FollowerUserName IN (
                       SELECT FollowedUserName 
                       FROM Follows 
                       WHERE FollowerUserName = :current_user
                   )
                 FETCH FIRST 1 ROWS ONLY) AS Reason_Text
            FROM Account suggested
            JOIN Follows f_friends_follow ON suggested.UserName = f_friends_follow.FollowedUserName
            JOIN Follows f_i_follow ON f_friends_follow.FollowerUserName = f_i_follow.FollowedUserName
            LEFT JOIN Verification v ON suggested.UserName = v.UserName
            WHERE 
                f_i_follow.FollowerUserName = :current_user
                AND suggested.UserName <> :current_user
                AND suggested.UserName NOT IN (
                    SELECT FollowedUserName 
                    FROM Follows 
                    WHERE FollowerUserName = :current_user
                )
            ORDER BY DBMS_RANDOM.VALUE
            FETCH FIRST 5 ROWS ONLY`,
            { current_user: currentUser }
        );

        const suggestions = result.rows.map(row => ({
            username: row[0],
            profileName: row[1] || row[0],
            profilePictureUrl: row[2] || DEFAULT_AVATAR_PATH,
            verificationStatus: row[3] || null,
            reasonText: row[4] || 'Suggested for you'
        }));

        res.json({ success: true, suggestions });

    } catch (error) {
        console.error('Error fetching suggestions:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch suggestions', error: error.message });
    } finally {
        if (connection) await connection.close();
    }
}

/**
 * Actions Controller
 * Handles likes, comments, comment likes, and replies
 */

import { getPool } from '../config/db.js';
import { DEFAULT_AVATAR_PATH } from '../utils/constants.js';

/**
 * Generate unique action ID (max 20 chars)
 * Format: a_ + base36 timestamp + random suffix
 */
function generateActionId() {
    const timestamp = Date.now().toString(36); // base36 timestamp (~8 chars)
    const random = Math.random().toString(36).substring(2, 6); // 4 random chars
    return `a_${timestamp}${random}`; // ~14 chars total
}

// ==================== CONTENT LIKES ====================

/**
 * Like a content (image/reel)
 * POST /api/actions/like/:contentId
 */
export const likeContent = async (req, res) => {
    const { contentId } = req.params;
    const username = req.username;
    let connection;

    try {
        connection = await getPool().getConnection();

        // Check if already liked
        const existingLike = await connection.execute(
            `SELECT l.ActionID FROM Likes l
             JOIN Action a ON l.ActionID = a.ActionID
             WHERE a.UserName = :username AND a.ContentID = :contentId`,
            { username, contentId },
            { outFormat: 4002 }
        );

        if (existingLike.rows.length > 0) {
            return res.status(400).json({ message: 'Already liked' });
        }

        const actionId = generateActionId();

        // Insert into Action table
        await connection.execute(
            `INSERT INTO Action (ActionID, UserName, ContentID, ActionDate)
             VALUES (:actionId, :username, :contentId, CURRENT_TIMESTAMP)`,
            { actionId, username, contentId }
        );

        // Insert into Likes table
        await connection.execute(
            `INSERT INTO Likes (ActionID) VALUES (:actionId)`,
            { actionId }
        );

        await connection.commit();

        // Get updated like count
        const countResult = await connection.execute(
            `SELECT COUNT(*) AS LIKE_COUNT FROM Likes l
             JOIN Action a ON l.ActionID = a.ActionID
             WHERE a.ContentID = :contentId`,
            { contentId },
            { outFormat: 4002 }
        );

        res.json({
            success: true,
            liked: true,
            likeCount: countResult.rows[0].LIKE_COUNT
        });

    } catch (err) {
        console.error('Error liking content:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: 'Error liking content' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
    }
};

/**
 * Unlike a content
 * DELETE /api/actions/like/:contentId
 */
export const unlikeContent = async (req, res) => {
    const { contentId } = req.params;
    const username = req.username;
    let connection;

    try {
        connection = await getPool().getConnection();

        // Find the like action
        const existingLike = await connection.execute(
            `SELECT l.ActionID FROM Likes l
             JOIN Action a ON l.ActionID = a.ActionID
             WHERE a.UserName = :username AND a.ContentID = :contentId`,
            { username, contentId },
            { outFormat: 4002 }
        );

        if (existingLike.rows.length === 0) {
            return res.status(400).json({ message: 'Not liked' });
        }

        const actionId = existingLike.rows[0].ACTIONID;

        // Delete from Likes (Action will cascade delete)
        await connection.execute(
            `DELETE FROM Action WHERE ActionID = :actionId`,
            { actionId }
        );

        await connection.commit();

        // Get updated like count
        const countResult = await connection.execute(
            `SELECT COUNT(*) AS LIKE_COUNT FROM Likes l
             JOIN Action a ON l.ActionID = a.ActionID
             WHERE a.ContentID = :contentId`,
            { contentId },
            { outFormat: 4002 }
        );

        res.json({
            success: true,
            liked: false,
            likeCount: countResult.rows[0].LIKE_COUNT
        });

    } catch (err) {
        console.error('Error unliking content:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: 'Error unliking content' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
    }
};

/**
 * Check if current user liked content
 * GET /api/actions/like/:contentId/check
 */
export const checkUserLikedContent = async (req, res) => {
    const { contentId } = req.params;
    const username = req.username;
    let connection;

    try {
        connection = await getPool().getConnection();

        const result = await connection.execute(
            `SELECT l.ActionID FROM Likes l
             JOIN Action a ON l.ActionID = a.ActionID
             WHERE a.UserName = :username AND a.ContentID = :contentId`,
            { username, contentId },
            { outFormat: 4002 }
        );

        res.json({ liked: result.rows.length > 0 });

    } catch (err) {
        console.error('Error checking like status:', err);
        res.status(500).json({ message: 'Error checking like status' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
    }
};

/**
 * Get users who liked content
 * GET /api/actions/like/:contentId/users
 */
//  export const getContentLikes = async (req, res) => {
//     const { contentId } = req.params;
//     let connection;

//     try {
//         connection = await getPool().getConnection();

//         const result = await connection.execute(
//             `SELECT 
//                 acc.UserName,
//                 acc.Profile_Name,
//                 acc.Profile_Picture_URL,
//                 v.Status AS Verification_Status
//              FROM Likes l
//              JOIN Action a ON l.ActionID = a.ActionID
//              JOIN Account acc ON a.UserName = acc.UserName
//              LEFT JOIN Verification v ON acc.UserName = v.UserName
//              WHERE a.ContentID = :contentId
//              ORDER BY 
//                 CASE WHEN v.Status = 'Verified' THEN 1 ELSE 2 END,
//                 a.ActionDate DESC`,
//             { contentId },
//             { outFormat: 4002 }
//         );

//         const likes = result.rows.map(row => ({
//             username: row.USERNAME,
//             profileName: row.PROFILE_NAME,
//             profilePictureUrl: row.PROFILE_PICTURE_URL || DEFAULT_AVATAR_PATH,
//             verificationStatus: row.VERIFICATION_STATUS
//         }));

//         res.json(likes);

//     } catch (err) {
//         console.error('Error getting likes:', err);
//         res.status(500).json({ message: 'Error getting likes' });
//     } finally {
//         if (connection) {
//             try { await connection.close(); } catch (e) { }
//         }
//     }
// };

// ==================== COMMENTS ====================

/**
 * Add a comment to content (or reply to comment)
 * POST /api/actions/comment/:contentId
 * Body: { text, parentCommentId? }
 */
export const addComment = async (req, res) => {
    const { contentId } = req.params;
    const { text, parentCommentId } = req.body;
    const username = req.username;
    let connection;

    if (!text || text.trim() === '') {
        return res.status(400).json({ message: 'Comment text is required' });
    }

    try {
        connection = await getPool().getConnection();

        const actionId = generateActionId();

        // Insert into Action table
        await connection.execute(
            `INSERT INTO Action (ActionID, UserName, ContentID, ActionDate)
             VALUES (:actionId, :username, :contentId, CURRENT_TIMESTAMP)`,
            { actionId, username, contentId }
        );

        // Insert into Comments table
        await connection.execute(
            `INSERT INTO Comments (ActionID, CommentText, ParentCommentID)
             VALUES (:actionId, :text, :parentCommentId)`,
            { actionId, text: text.trim(), parentCommentId: parentCommentId || null }
        );

        await connection.commit();

        // Fetch the created comment with user info
        const result = await connection.execute(
            `SELECT 
                c.ActionID,
                c.CommentText,
                c.ParentCommentID,
                a.ActionDate,
                acc.UserName,
                acc.Profile_Name,
                acc.Profile_Picture_URL,
                v.Status AS Verification_Status
             FROM Comments c
             JOIN Action a ON c.ActionID = a.ActionID
             JOIN Account acc ON a.UserName = acc.UserName
             LEFT JOIN Verification v ON acc.UserName = v.UserName
             WHERE c.ActionID = :actionId`,
            { actionId },
            { outFormat: 4002 }
        );

        const row = result.rows[0];
        const comment = {
            actionId: row.ACTIONID,
            text: row.COMMENTTEXT,
            parentCommentId: row.PARENTCOMMENTID,
            actionDate: row.ACTIONDATE,
            username: row.USERNAME,
            profileName: row.PROFILE_NAME,
            profilePictureUrl: row.PROFILE_PICTURE_URL || DEFAULT_AVATAR_PATH,
            verificationStatus: row.VERIFICATION_STATUS,
            likeCount: 0,
            isLiked: false,
            replies: []
        };

        res.json({ success: true, comment });

    } catch (err) {
        console.error('Error adding comment:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: 'Error adding comment' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
    }
};

/**
 * Delete a comment
 * DELETE /api/actions/comment/:actionId
 */
export const deleteComment = async (req, res) => {
    const { actionId } = req.params;
    const username = req.username;
    let connection;

    try {
        connection = await getPool().getConnection();

        // Verify ownership
        const check = await connection.execute(
            `SELECT a.UserName FROM Action a WHERE a.ActionID = :actionId`,
            { actionId },
            { outFormat: 4002 }
        );

        if (check.rows.length === 0) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (check.rows[0].USERNAME !== username) {
            return res.status(403).json({ message: 'Cannot delete others\' comments' });
        }

        // Delete (cascades to Comments table)
        await connection.execute(
            `DELETE FROM Action WHERE ActionID = :actionId`,
            { actionId }
        );

        await connection.commit();

        res.json({ success: true });

    } catch (err) {
        console.error('Error deleting comment:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: 'Error deleting comment' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
    }
};

/**
 * Get comments for content (with nested replies)
 * GET /api/actions/comment/:contentId
 */
export const getContentComments = async (req, res) => {
    const { contentId } = req.params;
    const username = req.username;
    let connection;

    try {
        connection = await getPool().getConnection();

        // Fetch all comments for this content
        const result = await connection.execute(
            `SELECT 
                c.ActionID,
                c.CommentText,
                c.ParentCommentID,
                a.ActionDate,
                acc.UserName,
                acc.Profile_Name,
                acc.Profile_Picture_URL,
                v.Status AS Verification_Status,
                (SELECT COUNT(*) FROM Comment_Like cl WHERE cl.Liked_Comment_ID = c.ActionID) AS Like_Count,
                (SELECT COUNT(*) FROM Comment_Like cl 
                 JOIN Action cla ON cl.ActionID = cla.ActionID 
                 WHERE cl.Liked_Comment_ID = c.ActionID AND cla.UserName = :username) AS Is_Liked
             FROM Comments c
             JOIN Action a ON c.ActionID = a.ActionID
             JOIN Account acc ON a.UserName = acc.UserName
             LEFT JOIN Verification v ON acc.UserName = v.UserName
             WHERE a.ContentID = :contentId
             ORDER BY a.ActionDate ASC`,
            { contentId, username },
            { outFormat: 4002 }
        );

        // Build nested structure
        const commentsMap = {};
        const topLevelComments = [];

        result.rows.forEach(row => {
            const comment = {
                actionId: row.ACTIONID,
                text: row.COMMENTTEXT,
                parentCommentId: row.PARENTCOMMENTID,
                actionDate: row.ACTIONDATE,
                username: row.USERNAME,
                profileName: row.PROFILE_NAME,
                profilePictureUrl: row.PROFILE_PICTURE_URL || DEFAULT_AVATAR_PATH,
                verificationStatus: row.VERIFICATION_STATUS,
                likeCount: row.LIKE_COUNT || 0,
                isLiked: row.IS_LIKED > 0,
                replies: []
            };
            commentsMap[comment.actionId] = comment;
        });

        // Organize into parent-child structure
        Object.values(commentsMap).forEach(comment => {
            if (comment.parentCommentId && commentsMap[comment.parentCommentId]) {
                commentsMap[comment.parentCommentId].replies.push(comment);
            } else if (!comment.parentCommentId) {
                topLevelComments.push(comment);
            }
        });

        // Sort by like count (most liked first) then by date
        topLevelComments.sort((a, b) => {
            if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
            return new Date(b.actionDate) - new Date(a.actionDate);
        });

        res.json(topLevelComments);

    } catch (err) {
        console.error('Error getting comments:', err);
        res.status(500).json({ message: 'Error getting comments' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
    }
};

// ==================== COMMENT LIKES ====================

/**
 * Like a comment
 * POST /api/actions/comment-like/:commentId
 */
export const likeComment = async (req, res) => {
    const { commentId } = req.params; // This is the ActionID of the comment
    const username = req.username;
    let connection;

    try {
        connection = await getPool().getConnection();

        // Check if comment exists
        const commentCheck = await connection.execute(
            `SELECT c.ActionID, a.ContentID FROM Comments c
             JOIN Action a ON c.ActionID = a.ActionID
             WHERE c.ActionID = :commentId`,
            { commentId },
            { outFormat: 4002 }
        );

        if (commentCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        const contentId = commentCheck.rows[0].CONTENTID;

        // Check if already liked
        const existingLike = await connection.execute(
            `SELECT cl.ActionID FROM Comment_Like cl
             JOIN Action a ON cl.ActionID = a.ActionID
             WHERE a.UserName = :username AND cl.Liked_Comment_ID = :commentId`,
            { username, commentId },
            { outFormat: 4002 }
        );

        if (existingLike.rows.length > 0) {
            return res.status(400).json({ message: 'Already liked' });
        }

        const actionId = generateActionId();

        // Insert into Action table (using the content's ContentID)
        await connection.execute(
            `INSERT INTO Action (ActionID, UserName, ContentID, ActionDate)
             VALUES (:actionId, :username, :contentId, CURRENT_TIMESTAMP)`,
            { actionId, username, contentId }
        );

        // Insert into Comment_Like table
        await connection.execute(
            `INSERT INTO Comment_Like (ActionID, Liked_Comment_ID)
             VALUES (:actionId, :commentId)`,
            { actionId, commentId }
        );

        await connection.commit();

        // Get updated like count
        const countResult = await connection.execute(
            `SELECT COUNT(*) AS LIKE_COUNT FROM Comment_Like WHERE Liked_Comment_ID = :commentId`,
            { commentId },
            { outFormat: 4002 }
        );

        res.json({
            success: true,
            liked: true,
            likeCount: countResult.rows[0].LIKE_COUNT
        });

    } catch (err) {
        console.error('Error liking comment:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: 'Error liking comment' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
    }
};

/**
 * Unlike a comment
 * DELETE /api/actions/comment-like/:commentId
 */
export const unlikeComment = async (req, res) => {
    const { commentId } = req.params;
    const username = req.username;
    let connection;

    try {
        connection = await getPool().getConnection();

        // Find the like action
        const existingLike = await connection.execute(
            `SELECT cl.ActionID FROM Comment_Like cl
             JOIN Action a ON cl.ActionID = a.ActionID
             WHERE a.UserName = :username AND cl.Liked_Comment_ID = :commentId`,
            { username, commentId },
            { outFormat: 4002 }
        );

        if (existingLike.rows.length === 0) {
            return res.status(400).json({ message: 'Not liked' });
        }

        const actionId = existingLike.rows[0].ACTIONID;

        // Delete the action (cascades to Comment_Like)
        await connection.execute(
            `DELETE FROM Action WHERE ActionID = :actionId`,
            { actionId }
        );

        await connection.commit();

        // Get updated like count
        const countResult = await connection.execute(
            `SELECT COUNT(*) AS LIKE_COUNT FROM Comment_Like WHERE Liked_Comment_ID = :commentId`,
            { commentId },
            { outFormat: 4002 }
        );

        res.json({
            success: true,
            liked: false,
            likeCount: countResult.rows[0].LIKE_COUNT
        });

    } catch (err) {
        console.error('Error unliking comment:', err);
        if (connection) await connection.rollback();
        res.status(500).json({ message: 'Error unliking comment' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
    }
};

/**
 * Get users who liked a comment
 * GET /api/actions/comment-like/:commentId
 */
export const getCommentLikes = async (req, res) => {
    const { commentId } = req.params;
    let connection;

    try {
        connection = await getPool().getConnection();

        const result = await connection.execute(
            `SELECT 
                acc.UserName,
                acc.Profile_Name,
                acc.Profile_Picture_URL,
                v.Status AS Verification_Status
             FROM Comment_Like cl
             JOIN Action a ON cl.ActionID = a.ActionID
             JOIN Account acc ON a.UserName = acc.UserName
             LEFT JOIN Verification v ON acc.UserName = v.UserName
             WHERE cl.Liked_Comment_ID = :commentId
             ORDER BY 
                CASE WHEN v.Status = 'Verified' THEN 1 ELSE 2 END,
                a.ActionDate DESC`,
            { commentId },
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
        console.error('Error getting comment likes:', err);
        res.status(500).json({ message: 'Error getting comment likes' });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
    }
};

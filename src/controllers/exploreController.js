/**
 * Explore Controller
 * API endpoints for the Explore page - mixed images and reels grid
 */
import { getPool } from '../config/db.js';
import { DEFAULT_AVATAR_PATH } from '../utils/constants.js';

/**
 * Get explore grid items (mixed images and reels)
 * Returns a randomized grid of content from other users
 */
export const getExploreGrid = async (req, res) => {
    const currentUser = req.username;
    const offset = parseInt(req.query.offset) || 0;
    const seed = req.query.seed || 'default_seed';
    const limit = 18; // 3x6 grid

    let connection;

    try {
        connection = await getPool().getConnection();

        const result = await connection.execute(
            `SELECT * FROM (
                SELECT 
                    c.ContentID,
                    c.Path,
                    
                    CASE 
                        WHEN r.ContentID IS NOT NULL THEN 'Reel'
                        WHEN i.ContentID IS NOT NULL THEN 'Image'
                        ELSE 'Unknown'
                    END AS Content_Type,
                    
                    r.ReelDuration

                FROM Content c
                LEFT JOIN Reel r ON c.ContentID = r.ContentID
                LEFT JOIN Image i ON c.ContentID = i.ContentID
                JOIN Account a ON c.UserName = a.UserName
                
                WHERE 
                    c.UserName <> :currentUser
                    AND (
                        a.Visibility = 'Public'
                        OR EXISTS (
                            SELECT 1 FROM Follows f 
                            WHERE f.FollowerUserName = :currentUser 
                            AND f.FollowedUserName = c.UserName
                        )
                    )
            )
            ORDER BY ORA_HASH(ContentID || :seed)
            OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`,
            {
                currentUser: currentUser,
                seed: seed,
                offset: offset,
                limit: limit
            },
            { outFormat: 4002 }
        );

        const items = result.rows.map(row => ({
            contentId: row.CONTENTID,
            path: row.PATH,
            contentType: row.CONTENT_TYPE,
            reelDuration: row.REELDURATION || null
        }));

        res.json(items);

    } catch (err) {
        console.error('Error fetching explore grid:', err);
        res.status(500).json({ message: 'Error fetching explore content' });
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
 * Get post details for modal view
 * Returns full post info including author, caption, counts
 */
export const getPostDetails = async (req, res) => {
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
                
                (SELECT LISTAGG(t.TagName, ', ') WITHIN GROUP (ORDER BY t.TagName)
                 FROM Content_Tag ct
                 JOIN Tags t ON ct.TagID = t.TagID
                 WHERE ct.ContentID = c.ContentID) AS Tags,
                
                (SELECT COUNT(*) FROM Likes l 
                 JOIN Action act ON l.ActionID = act.ActionID 
                 WHERE act.ContentID = c.ContentID) AS Total_Likes,

                (SELECT COUNT(*) FROM Comments com 
                 JOIN Action act ON com.ActionID = act.ActionID 
                 WHERE act.ContentID = c.ContentID) AS Total_Comments,
                 
                (SELECT COUNT(*) FROM Likes l 
                 JOIN Action act ON l.ActionID = act.ActionID 
                 WHERE act.ContentID = c.ContentID AND act.UserName = :currentUser) AS User_Liked

            FROM Content c
            JOIN Account a ON c.UserName = a.UserName
            LEFT JOIN Verification v ON a.UserName = v.UserName
            LEFT JOIN Reel r ON c.ContentID = r.ContentID
            LEFT JOIN Image i ON c.ContentID = i.ContentID

            WHERE c.ContentID = :contentId`,
            { contentId, currentUser },
            { outFormat: 4002 }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const row = result.rows[0];

        const post = {
            contentId: row.CONTENTID,
            path: row.PATH,
            caption: row.CAPTION,
            postDate: row.POST_DATE,
            username: row.USERNAME,
            profileName: row.PROFILE_NAME,
            profilePictureUrl: row.PROFILE_PICTURE_URL || DEFAULT_AVATAR_PATH,
            verificationStatus: row.AUTHOR_VERIFICATION,
            contentType: row.CONTENT_TYPE,
            reelDuration: row.REELDURATION,
            tags: row.TAGS ? row.TAGS.split(', ') : [],
            totalLikes: row.TOTAL_LIKES || 0,
            totalComments: row.TOTAL_COMMENTS || 0,
            userLiked: row.USER_LIKED > 0
        };

        res.json(post);

    } catch (err) {
        console.error('Error fetching post details:', err);
        res.status(500).json({ message: 'Error fetching post details' });
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
 * Get comments for a post (parent comments only with threading support)
 */
export const getPostComments = async (req, res) => {
    const { contentId } = req.params;
    let connection;

    try {
        connection = await getPool().getConnection();

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
                act.ContentID = :contentId
                AND com.ParentCommentID IS NULL

            ORDER BY 
                Comment_Likes_Count DESC,
                act.ActionDate DESC`,
            { contentId },
            { outFormat: 4002 }
        );

        const comments = result.rows.map(row => ({
            commentId: row.COMMENT_ID,
            commentText: row.COMMENTTEXT,
            commentDate: row.COMMENT_DATE,
            username: row.USERNAME,
            profilePictureUrl: row.PROFILE_PICTURE_URL || DEFAULT_AVATAR_PATH,
            verificationStatus: row.VERIFICATION_STATUS,
            likesCount: row.COMMENT_LIKES_COUNT || 0,
            replyCount: row.REPLY_COUNT || 0
        }));

        res.json(comments);

    } catch (err) {
        console.error('Error fetching post comments:', err);
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

/**
 * Get replies to a specific comment
 */
export const getCommentReplies = async (req, res) => {
    const { commentId } = req.params;
    let connection;

    try {
        connection = await getPool().getConnection();

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
                reply.ParentCommentID = :commentId
                
            ORDER BY act.ActionDate ASC`,
            { commentId },
            { outFormat: 4002 }
        );

        const replies = result.rows.map(row => ({
            replyId: row.REPLY_ID,
            commentText: row.COMMENTTEXT,
            replyDate: row.REPLY_DATE,
            username: row.USERNAME,
            profilePictureUrl: row.PROFILE_PICTURE_URL || DEFAULT_AVATAR_PATH,
            verificationStatus: row.VERIFICATION_STATUS,
            likesCount: row.REPLY_LIKES_COUNT || 0
        }));

        res.json(replies);

    } catch (err) {
        console.error('Error fetching comment replies:', err);
        res.status(500).json({ message: 'Error fetching replies' });
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

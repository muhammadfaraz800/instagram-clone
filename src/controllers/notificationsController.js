/**
 * Notifications Controller
 * Handles follow requests and notifications
 */
import { getPool } from '../config/db.js';

/**
 * Get pending follow requests for the logged-in user
 * GET /api/notifications/requests
 */
export const getRequests = async (req, res) => {
    const currentUser = req.username; // From verifyToken middleware
    let connection;

    try {
        connection = await getPool().getConnection();

        // Get pending requests with sender info (row exists = pending)
        const result = await connection.execute(
            `SELECT 
                r.SenderUserName,
                a.Profile_Name,
                a.Profile_Picture_URL,
                (SELECT COUNT(*) FROM Follows 
                 WHERE LOWER(FollowerUserName) = LOWER(:currentUser) 
                 AND LOWER(FollowedUserName) = LOWER(r.SenderUserName)) AS isFollowingBack
             FROM Requests r
             JOIN Account a ON LOWER(r.SenderUserName) = LOWER(a.UserName)
             WHERE LOWER(r.ReceiverUserName) = LOWER(:currentUser)
             ORDER BY r.SenderUserName`,
            { currentUser },
            { outFormat: 4002 }
        );

        const requests = (result.rows || []).map(row => ({
            username: row.SENDERUSERNAME,
            profileName: row.PROFILE_NAME,
            profilePictureUrl: row.PROFILE_PICTURE_URL || '/uploads/default/default-avatar.png',
            isFollowingBack: row.ISFOLLOWINGBACK > 0
        }));

        res.json(requests);

    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'Failed to fetch requests', details: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
};

/**
 * Accept a follow request
 * POST /api/notifications/requests/:username/accept
 */
export const acceptRequest = async (req, res) => {
    const { username: senderUsername } = req.params;
    const currentUser = req.username; // From verifyToken middleware
    let connection;

    try {
        connection = await getPool().getConnection();

        // Verify the request exists (row exists = pending)
        const requestResult = await connection.execute(
            `SELECT SenderUserName FROM Requests 
             WHERE LOWER(SenderUserName) = LOWER(:senderUsername) 
             AND LOWER(ReceiverUserName) = LOWER(:currentUser)`,
            { senderUsername, currentUser },
            { outFormat: 4002 }
        );

        if (!requestResult.rows || requestResult.rows.length === 0) {
            return res.status(404).json({ error: 'No pending request from this user' });
        }

        const actualSenderUsername = requestResult.rows[0].SENDERUSERNAME;

        // Start transaction
        // 1. Delete the request row (no more status updates)
        await connection.execute(
            `DELETE FROM Requests 
             WHERE LOWER(SenderUserName) = LOWER(:senderUsername) 
             AND LOWER(ReceiverUserName) = LOWER(:currentUser)`,
            { senderUsername, currentUser },
            { autoCommit: false }
        );

        // 2. Insert into Follows table (sender now follows receiver)
        await connection.execute(
            `INSERT INTO Follows (FollowerUserName, FollowedUserName) 
             VALUES (:senderUsername, :currentUser)`,
            { senderUsername: actualSenderUsername, currentUser },
            { autoCommit: false }
        );

        await connection.commit();

        // Check if current user follows the sender back
        const followBackResult = await connection.execute(
            `SELECT 1 FROM Follows 
             WHERE LOWER(FollowerUserName) = LOWER(:currentUser) 
             AND LOWER(FollowedUserName) = LOWER(:senderUsername)`,
            { currentUser, senderUsername },
            { outFormat: 4002 }
        );

        const isFollowingBack = followBackResult.rows && followBackResult.rows.length > 0;

        res.json({
            accepted: true,
            message: 'Follow request accepted',
            isFollowingBack
        });

    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (e) { console.error(e); }
        }
        // Handle duplicate key (already following - shouldn't happen but just in case)
        if (error.errorNum === 1) {
            return res.status(400).json({ error: 'User is already following you' });
        }
        console.error('Error accepting request:', error);
        res.status(500).json({ error: 'Failed to accept request', details: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
};

/**
 * Reject a follow request
 * POST /api/notifications/requests/:username/reject
 */
export const rejectRequest = async (req, res) => {
    const { username: senderUsername } = req.params;
    const currentUser = req.username; // From verifyToken middleware
    let connection;

    try {
        connection = await getPool().getConnection();

        // Delete the request row (row exists = pending)
        const result = await connection.execute(
            `DELETE FROM Requests 
             WHERE LOWER(SenderUserName) = LOWER(:senderUsername) 
             AND LOWER(ReceiverUserName) = LOWER(:currentUser)`,
            { senderUsername, currentUser },
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'No pending request from this user' });
        }

        res.json({ rejected: true, message: 'Follow request rejected' });

    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({ error: 'Failed to reject request', details: error.message });
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { console.error(e); }
        }
    }
};

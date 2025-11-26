/**
 * Update user details
 */
export const updateUser = (req, res) => {
    const { firstname, lastname } = req.body;
    if (!firstname || !lastname) {
        return res.status(400).send({ message: 'First name and Last name are required' });
    }
    // In a real app, you would update the database here.
    // For now, we just return the success message as per original code.
    res.json({ message: `Person name updated to ${firstname} ${lastname}` });
};

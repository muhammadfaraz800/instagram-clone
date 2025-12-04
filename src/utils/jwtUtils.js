import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use env variable in production

export const generateToken = (username) => {
    return jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
};

export const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).send({ message: "No token provided." });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "Unauthorized." });
        }
        req.username = decoded.username;
        next();
    });
};

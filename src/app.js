import express from 'express';
import routes from './routes/index.js';

import cookieParser from 'cookie-parser';

const app = express();

// Middleware
app.use(express.static('public')); // Serve static files
app.use('/uploads', express.static('uploads')); // Serve uploaded files
app.use(express.json()); // Parse JSON bodies
app.use(cookieParser()); // Parse cookies

// Routes
app.use('/api', routes);

// Profile page routes - serve profile.html for /{username} and /{username}/reels
// These must come after static files and API routes
const staticExtensions = /\.(html|css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i;
const knownRoutes = ['api', 'uploads', 'login.html', 'signup.html', 'settings.html', 'index.html'];

app.get('/:username', (req, res, next) => {
    const { username } = req.params;

    // Skip if it's a static file extension or known route
    if (staticExtensions.test(username) || knownRoutes.includes(username.toLowerCase())) {
        return next();
    }

    res.sendFile('profile.html', { root: 'public' });
});

app.get('/:username/reels', (req, res, next) => {
    const { username } = req.params;

    // Skip if it looks like a static file request
    if (staticExtensions.test(username)) {
        return next();
    }

    res.sendFile('profile.html', { root: 'public' });
});

export default app;

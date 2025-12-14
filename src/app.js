import express from 'express';
import routes from './routes/index.js';

import cookieParser from 'cookie-parser';

import { verifyToken } from './utils/jwtUtils.js';

const app = express();

// Middleware
app.use(cookieParser()); // Parse cookies
app.use(express.json()); // Parse JSON bodies
app.use(express.static('public')); // Serve static files
app.use('/uploads', verifyToken, express.static('uploads')); // Serve uploaded files

// Routes
app.use('/api', routes);

// Profile page routes - serve profile.html for /{username} and /{username}/reels
// These must come after static files and API routes
const staticExtensions = /\.(html|css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i;

app.get('/:username', (req, res, next) => {
    const { username } = req.params;

    // Skip if it's a reserved keyword or looks like a static file
    // using 'api', 'uploads' etc to prevent catching server routes
    // using 'explore', 'reels' (root level) to prevent catching future routes
    const reservedRoutes = ['api', 'uploads', 'explore', 'reels', 'login.html', 'signup.html', 'settings.html', 'index.html'];

    if (staticExtensions.test(username) || reservedRoutes.includes(username.toLowerCase())) {
        return next();
    }

    res.sendFile('profile.html', { root: 'public' });
});

// Handle /:username/reels (without subpaths)
app.get('/:username/reels', (req, res, next) => {
    const { username } = req.params;

    // Skip if it looks like a static file request
    if (staticExtensions.test(username)) {
        return next();
    }
    res.sendFile('profile.html', { root: 'public' });
});

// Handle /:username/reels and redirect deeper paths
// Using regex to capture username and any remaining path
// Matches /username/reels/anything
app.get(/^\/([^/]+)\/reels\/(.+)$/, (req, res, next) => {
    const username = req.params[0];

    // Skip if it looks like a static file request
    if (staticExtensions.test(username)) {
        return next();
    }

    // Always redirect any subpath back to the main reels page
    res.redirect(`/${username}/reels`);
});

// 404 Catch-all - must be the last route
app.use((req, res) => {
    res.status(404).sendFile('404.html', { root: 'public' });
});

export default app;

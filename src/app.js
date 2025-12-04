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

export default app;

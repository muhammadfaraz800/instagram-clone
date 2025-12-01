import express from 'express';
import routes from './routes/index.js';

const app = express();

// Middleware
app.use(express.static('public')); // Serve static files
app.use(express.json()); // Parse JSON bodies

// Routes
app.use('/api', routes);

export default app;

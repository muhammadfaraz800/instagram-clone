import app from './app.js';
import { initializeDatabase } from './config/db.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    await initializeDatabase();

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};

startServer();


// TODO: Make sure every file uploaded has unique name

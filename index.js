import express from 'express';
import router from './route.js';
const app = express();

app.use(express.json()); //middleware to parse JSON bodies
app.use(express.static('public')); //middleware to serve static files
const PORT = process.env.PORT || 3000;


app.use('/api', router); //middleware to handle api routes

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
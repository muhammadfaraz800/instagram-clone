import express from 'express';
import router from './route.js';
const app = express();

app.use(express.json());
app.use(express.static('public'));
const PORT = process.env.PORT || 3000;


app.use('/', router);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
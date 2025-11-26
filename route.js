import express from 'express';
import { signupPostController, loginPostController } from './controller.js';
const router = express.Router();

router.post('/signup', signupPostController);

router.post('/login', loginPostController);

// update person name - we are expecting json data
router.put('/update', (req, res) => {
  const { firstname, lastname } = req.body;
  if (!firstname || !lastname) {
    return res.status(400).send({ message: 'First name and Last name are required' });
  }
  res.json({ message: `Person name updated to ${firstname} ${lastname}` });
});

export default router;
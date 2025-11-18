import express from 'express';
import { loginController, signupController, signupPostController } from './controller.js';
const router = express.Router();
router.use(express.json()); //middleware to parse JSON bodies

router.get('/signin', loginController);
router.get('/signup', signupController);
router.post('/signup', signupPostController);
// update person name - we are expecting json data
router.put('/update', (req, res) => {
  const {firstname, lastname} =  req.body;
  if(!firstname || !lastname) {
    return  res.status(400).send({message: 'First name and Last name are required'});
  }
  res.json({message: `Person name updated to ${firstname} ${lastname}`});
});

export default router;
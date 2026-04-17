import express from 'express';
import {
  createProfile,
  getProfile,
  getAllProfiles,
  deleteProfile
} from '../controllers/profileController.js';

const router = express.Router();

router.post('/profiles', createProfile);
router.get('/profiles', getAllProfiles);
router.get('/profiles/:id', getProfile);
router.delete('/profiles/:id', deleteProfile);

export default router;
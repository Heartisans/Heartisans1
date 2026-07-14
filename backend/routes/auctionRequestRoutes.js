import express from 'express';
import {
  createRequest,
  getAllRequests,
  getUserRequests,
  updateStatus,
  publishAuction
} from '../controllers/auctionRequestController.js';

const router = express.Router();

router.post('/', createRequest);
router.get('/', getAllRequests);
router.get('/user/:userId', getUserRequests);
router.put('/:id/status', updateStatus);
router.post('/:id/publish', publishAuction);

export default router;

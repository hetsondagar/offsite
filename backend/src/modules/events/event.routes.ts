import { Router } from 'express';
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from './event.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/', authenticateUser, createEvent);
router.get('/', authenticateUser, getEvents);
router.get('/:id', authenticateUser, getEventById);
router.patch('/:id', authenticateUser, updateEvent);
router.delete('/:id', authenticateUser, deleteEvent);

export default router;


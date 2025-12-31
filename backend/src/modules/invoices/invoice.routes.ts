import { Router } from 'express';
import { createInvoice, getInvoices, getInvoiceById } from './invoice.controller';
import { authenticateUser } from '../../middlewares/auth.middleware';
import { authorizePermission } from '../../middlewares/role.middleware';

const router = Router();

router.post(
  '/',
  authenticateUser,
  authorizePermission('canManageInvoices'),
  createInvoice
);
router.get(
  '/',
  authenticateUser,
  authorizePermission('canViewInvoices'),
  getInvoices
);
router.get(
  '/:id',
  authenticateUser,
  authorizePermission('canViewInvoices'),
  getInvoiceById
);

export default router;


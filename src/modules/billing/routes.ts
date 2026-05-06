import { Router } from 'express';
import { billingController } from './controller';
import { authMiddleware } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';

const router = Router();

router.use(authMiddleware);

router.get('/pricing', authorize('billing', 'read'), billingController.getPricing);
router.post('/initialize', authorize('billing', 'create'), billingController.initializePayment);
router.post('/verify', authorize('billing', 'update'), billingController.verifyPayment);
router.get('/subscription', authorize('billing', 'read'), billingController.getSubscription);

export default router;

import { Router } from 'express';
import { billingController } from './controller';

const router = Router();

router.get('/pricing', billingController.getPricing);
router.post('/initialize', billingController.initializePayment);
router.post('/verify', billingController.verifyPayment);
router.get('/subscription', billingController.getSubscription);

export default router;

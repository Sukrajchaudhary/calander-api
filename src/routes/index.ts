import { Router, Request, Response } from 'express';
import v1Routes from './v1';
const router: Router = Router();
// V1 routes
router.use('/v1', v1Routes);
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API is running',
  });
});

export default router;

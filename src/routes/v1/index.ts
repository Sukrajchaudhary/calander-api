import { Router, Request, Response } from "express";

import { calanderRoutes } from "../../modules/calander";

const router: Router = Router();
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "API v1 is running",
    version: "v1",
  });

});
router.use("/calander", calanderRoutes);


export default router;

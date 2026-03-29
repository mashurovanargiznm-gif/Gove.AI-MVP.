import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import analyzeRouter from "./analyze.js";
import approveRouter from "./approve.js";
import transactionsRouter from "./transactions.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analyzeRouter);
router.use(approveRouter);
router.use(transactionsRouter);

export default router;

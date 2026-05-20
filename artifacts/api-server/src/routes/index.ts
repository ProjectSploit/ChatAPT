import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiConversationsRouter from "./openai/conversations";
import searchRouter from "./search";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/openai/conversations", openaiConversationsRouter);
router.use(searchRouter);

export default router;

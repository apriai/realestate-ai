import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import propertiesRouter from "./properties";
import projectsRouter from "./projects";
import zonesRouter from "./zones";
import aiChatRouter from "./aiChat";
import notificationsRouter from "./notifications";
import investmentInterestsRouter from "./investmentInterests";
import adminRouter from "./admin";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(propertiesRouter);
router.use(projectsRouter);
router.use(zonesRouter);
router.use(aiChatRouter);
router.use(notificationsRouter);
router.use(investmentInterestsRouter);
router.use(adminRouter);
router.use(storageRouter);

export default router;

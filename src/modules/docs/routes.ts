import { Router } from "express";
import { docsController } from "./controller";

const router = Router();

router.get("/", docsController.index);
router.get("/openapi.json", docsController.getOpenApiJson);
router.get("/postman-collection.json", docsController.getPostmanCollection);

export default router;

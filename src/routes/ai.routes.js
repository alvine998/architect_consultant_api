const { Router } = require("express");
const { chat, image } = require("../controllers/ai.controller");
const authMiddleware = require("../utils/auth.middleware");

const router = Router();

router.post("/chat", authMiddleware, chat);
router.post("/images", authMiddleware, image);

module.exports = router;

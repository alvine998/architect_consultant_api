const { Router } = require('express');
const { getAll, getOne, create, update, remove } = require('../controllers/user.controller');
const authMiddleware = require('../utils/auth.middleware');

const router = Router();

router.get('/', authMiddleware, getAll);
router.get('/:id', authMiddleware, getOne);
router.post('/', authMiddleware, create);
router.put('/:id', authMiddleware, update);
router.delete('/:id', authMiddleware, remove);

module.exports = router;

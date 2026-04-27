const { Router } = require('express');
const { register, login, sendOtp, verifyOtp, forgotPassword } = require('../controllers/auth.controller');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', forgotPassword);

module.exports = router;

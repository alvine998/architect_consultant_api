const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Otp = require('../models/otp.model');
const UserAttempt = require('../models/user_attempt.model');
const { sendOtpEmail } = require('../utils/email');
const OTP_RESEND_WAIT_SECONDS = 60;

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
};

const getDefaultName = (email) => {
  return email.split('@')[0] || email;
};

const createUserToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email, role: 'user' }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const sanitizeUser = (user) => {
  const { password, ...data } = user.toJSON();
  return data;
};

const storeUserAttempt = async (req, email, success) => {
  try {
    await UserAttempt.create({
      email,
      ipaddress: getClientIp(req),
      success,
    });
  } catch (err) {
    console.error('Failed to store user attempt:', err.message);
  }
};

const getLatestOtpWaitTime = async (email) => {
  const latestOtp = await Otp.findOne({
    where: { email },
    order: [['createdAt', 'DESC']],
  });

  if (!latestOtp) return 0;

  const createdAt = new Date(latestOtp.createdAt).getTime();
  const elapsedSeconds = Math.floor((Date.now() - createdAt) / 1000);

  return Math.max(0, OTP_RESEND_WAIT_SECONDS - elapsedSeconds);
};

const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    const { password: _, ...data } = user.toJSON();
    res.status(201).json({ user: data, token });
  } catch (err) {
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: err.errors.map((e) => e.message) });
    }
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    const { password: _, ...data } = user.toJSON();
    res.json({ user: data, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const sendOtp = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const email = req.body.email ? req.body.email.trim().toLowerCase() : null;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const waitSeconds = await getLatestOtpWaitTime(email);
    if (waitSeconds > 0) {
      return res.status(429).json({
        message: `Please wait ${waitSeconds} seconds before requesting another OTP`,
        retryAfter: waitSeconds,
      });
    }

    const [user, created] = await User.findOrCreate({
      where: { email },
      defaults: {
        name: name || getDefaultName(email),
        email,
        phone: phone || null,
      },
    });

    const updates = {};
    if (!created && name && user.name !== name) updates.name = name;
    if (!created && phone && user.phone !== phone) updates.phone = phone;

    if (Object.keys(updates).length > 0) {
      await user.update(updates);
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await Otp.create({ email, code, expiresAt });

    const emailSent = await sendOtpEmail(email, code);
    if (!emailSent) {
      await storeUserAttempt(req, email, false);
      return res.status(500).json({ message: 'Failed to send OTP email' });
    }

    await storeUserAttempt(req, email, true);

    const { password: _, ...userData } = user.toJSON();
    res.json({
      message: 'OTP sent to email',
      user: userData,
      userCreated: created,
    });
  } catch (err) {
    if (req.body.email) {
      await storeUserAttempt(req, req.body.email.trim().toLowerCase(), false);
    }

    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: err.errors.map((e) => e.message) });
    }

    res.status(500).json({ message: err.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const email = req.body.email ? req.body.email.trim().toLowerCase() : null;
    const { code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    const otp = await Otp.findOne({
      where: { email, code, isUsed: false },
      raw: true,
    });

    if (!otp) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    if (new Date() > new Date(otp.expiresAt)) {
      return res.status(400).json({ message: 'OTP code expired' });
    }

    await Otp.update({ isUsed: true }, { where: { id: otp.id } });

    const [user] = await User.findOrCreate({
      where: { email },
      defaults: {
        name: getDefaultName(email),
        email,
      },
    });

    const token = createUserToken(user);

    res.json({
      message: 'OTP verified successfully',
      user: sanitizeUser(user),
      token,
    });
  } catch (err) {
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: err.errors.map((e) => e.message) });
    }

    res.status(500).json({ message: err.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body;

    if (!email || !code || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const otp = await Otp.findOne({
      where: { email, code, isUsed: true },
      raw: true,
    });

    if (!otp) {
      return res.status(400).json({ message: 'Invalid OTP or email not verified' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login, sendOtp, verifyOtp, forgotPassword };

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

const sendOtpEmail = async (email, code) => {
  try {
    const mailOptions = {
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      html: `
        <h2>OTP Verification</h2>
        <p>Your OTP code is: <strong>${code}</strong></p>
        <p>This code expires in 10 minutes.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Email sending failed:', err);
    return false;
  }
};

module.exports = { sendOtpEmail };

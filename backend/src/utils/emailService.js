const nodemailer = require('nodemailer');

let transporter = null;

const isEmailConfigured = () => {
  return (
    process.env.EMAIL_HOST &&
    process.env.EMAIL_PORT &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS
  );
};

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  return transporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!isEmailConfigured()) {
    console.warn('Email credentials are not configured. Skipping email send.');
    return false;
  }

  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
      html
    });
    return true;
  } catch (error) {
    console.error('Email send failed:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  isEmailConfigured
};


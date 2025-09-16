const nodemailer = require("nodemailer");
require("dotenv").config();

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

if (!host || !port || !user || !pass) {
  console.warn(
    "Mailer not fully configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS in .env to enable email sending."
  );
}

const transporter = nodemailer.createTransport({
  host: host || "smtp.example.com",
  port: port ? Number(port) : 587,
  secure: port && Number(port) === 465, // true for 465, false for other ports
  auth: {
    user: user || "user@example.com",
    pass: pass || "password",
  },
});

const sendVerificationEmail = async ({ to, name, token, origin }) => {
  const verifyUrl = `${origin.replace(
    /\/$/,
    ""
  )}/api/auth/verify-email?token=${encodeURIComponent(
    token
  )}&email=${encodeURIComponent(to)}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || "no-reply@portfolio.local",
    to,
    subject: "Verify your email for Portfolio",
    html: `
      <p>Hi ${name || "User"},</p>
      <p>Thanks for registering. Please verify your email by clicking the link below:</p>
      <p><a href="${verifyUrl}">Verify Email</a></p>
      <p>If the link doesn't work, copy and paste this URL into your browser:</p>
      <p>${verifyUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't sign up, ignore this email.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendVerificationEmail,
};

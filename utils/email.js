const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async ({ to, subject, text, html }) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail', // Replace with your email provider
        auth: {
            user: process.env.EMAIL_USER, // Add this to your .env file
            pass: process.env.EMAIL_PASS, // Add this to your .env file
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text,
        html, // Optional HTML content
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Email not sent');
    }
};

module.exports = sendEmail;
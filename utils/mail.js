import nodemailer from 'nodemailer';

/**
 * Send an email using SMTP
 * @param {Object} options - Email options (to, subject, text, html)
 */
export const sendEmail = async (options) => {
    // Create a transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    // Define email options
    const mailOptions = {
        from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);

    console.log('📧 Email sent: %s', info.messageId);
    return info;
};

/**
 * Generate a 6-digit numeric OTP
 */
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

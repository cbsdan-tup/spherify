const sendEmail = require('../utils/sendEmail');

exports.submitContactForm = async (req, res) => {
    try {
        const { name, email, message, subject } = req.body;

        // Validate request
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and message'
            });
        }

        // Email to admin
        const adminEmailOptions = {
            email: process.env.SMTP_EMAIL, // Using the email from env for receiving
            subject: `Contact Form: ${subject || 'New Message from Spherify Contact Form'}`,
            message: `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>New Contact Form Submission</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
                        .header { background-color: #4a90e2; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                        .content { padding: 20px; background-color: #ffffff; border: 1px solid #e1e1e1; border-radius: 0 0 5px 5px; }
                        .message-box { background-color: #f7f9fc; padding: 15px; border-left: 4px solid #4a90e2; margin: 20px 0; }
                        .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #666; }
                        .info-row { margin-bottom: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>New Contact Form Submission</h1>
                    </div>
                    <div class="content">
                        <div class="info-row"><strong>Name:</strong> ${name}</div>
                        <div class="info-row"><strong>Email:</strong> ${email}</div>
                        <div class="info-row"><strong>Subject:</strong> ${subject || 'N/A'}</div>
                        <div class="info-row"><strong>Date:</strong> ${new Date().toLocaleString()}</div>
                        
                        <h3>Message:</h3>
                        <div class="message-box">
                            ${message.replace(/\n/g, '<br>')}
                        </div>
                        
                        <div class="footer">
                            <p>This is an automated message from your Spherify contact system.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await sendEmail(adminEmailOptions);

        // Confirmation email to user
        const userEmailOptions = {
            email: email,
            subject: 'Thank you for contacting Spherify',
            message: `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Thank You for Contacting Spherify</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
                        .header { background-color: #4a90e2; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                        .content { padding: 20px; background-color: #ffffff; border: 1px solid #e1e1e1; border-radius: 0 0 5px 5px; }
                        .message-box { background-color: #f7f9fc; padding: 15px; border-left: 4px solid #4a90e2; margin: 20px 0; }
                        .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #666; border-top: 1px solid #e1e1e1; padding-top: 15px; }
                        .button { background-color: #4a90e2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Thank You for Contacting Us</h1>
                    </div>
                    <div class="content">
                        <p>Dear ${name},</p>
                        
                        <p>Thank you for reaching out to Spherify. We have received your inquiry and appreciate your interest in our services.</p>
                        
                        <p>Our team will review your message and get back to you as soon as possible. Please allow up to 24-48 hours for a response during business days.</p>
                        
                        <p>For your reference, here's a copy of your message:</p>
                        
                        <div class="message-box">
                            ${message.replace(/\n/g, '<br>')}
                        </div>
                        
                        <p>If you have any additional questions or information to provide, please reply to this email.</p>
                        
                        <p>Best regards,<br><strong>The Spherify Team</strong></p>
                        
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} Spherify. All rights reserved.</p>
                            <p><a href="https://spherify.vercel.app">spherify.vercel.app</a></p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await sendEmail(userEmailOptions);

        res.status(200).json({
            success: true,
            message: 'Your message has been sent successfully!'
        });
    } catch (error) {
        console.error('Contact form submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.'
        });
    }
};

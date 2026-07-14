import nodemailer from 'nodemailer';

// Create transporter based on email provider
const createTransporter = () => {
  // For development, use Mailtrap
  if (process.env.NODE_ENV === 'development' || process.env.EMAIL_PROVIDER === 'mailtrap') {
    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.MAILTRAP_PORT) || 2525,
      secure: false, // Mailtrap uses STARTTLS
      auth: {
        user: process.env.MAILTRAP_USERNAME,
        pass: process.env.MAILTRAP_PASSWORD,
      },
    });
  }

  if (process.env.EMAIL_PROVIDER === 'resend') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.resend.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT == '465', // true for 465, false for other ports
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    });
  } else {
    // Fallback to generic SMTP
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT == '465',
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
};

// Send general email
export const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Heartisans <no-reply@heartisans.com>',
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV === 'development' || process.env.EMAIL_PROVIDER === 'mailtrap') {
      console.log('📧 Email sent to Mailtrap successfully!');
      console.log(`📬 Check your Mailtrap inbox for: ${options.subject}`);
    } else {
      console.log('Email sent successfully');
    }
  } catch (error) {
    console.error('Error sending email:', error);
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Development Mode: Ignoring email send failure so you can still use the OTP printed above.');
    } else {
      throw new Error('Email could not be sent');
    }
  }
};

// Send OTP email
export const sendOTPEmail = async (email, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0;">Heartisans</h1>
          <p style="color: #666; margin: 5px 0;">Artisan Marketplace</p>
        </div>
        
        <h2 style="color: #333; text-align: center;">Email Verification</h2>
        <p style="color: #555; font-size: 16px;">Thank you for registering with Heartisans!</p>
        <p style="color: #555; font-size: 16px;">Your verification code is:</p>
        
        <div style="background-color: #f4f7ff; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px dashed #4a90e2;">
          <h1 style="color: #4a90e2; font-size: 32px; margin: 0; letter-spacing: 2px;">${otp}</h1>
        </div>
        
        <p style="color: #555; font-size: 14px;">This code will expire in ${process.env.OTP_EXPIRE_MINUTES || 10} minutes.</p>
        <p style="color: #555; font-size: 14px;">If you didn't request this verification, please ignore this email.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 12px; text-align: center;">
          This is an automated message from Heartisans. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  // Log OTP for development convenience
  if (process.env.NODE_ENV === 'development') {
    console.log('🔐 ===== OTP CODE (Development) =====');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 OTP Code: ${otp}`);
    console.log(`⏰ Expires in: ${process.env.OTP_EXPIRE_MINUTES || 10} minutes`);
    console.log('====================================');
  }

  await sendEmail({
    email,
    subject: '🔐 Heartisans - Email Verification Code',
    html,
    message: `Your Heartisans verification code is: ${otp}. This code will expire in ${process.env.OTP_EXPIRE_MINUTES || 10} minutes.`
  });
};

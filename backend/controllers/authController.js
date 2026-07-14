import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/userModel.js';
import { sendEmail, sendOTPEmail } from '../utils/email.js';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET // You need to provide the client secret
);

// Generate tokens
const generateTokens = (user) => {
  const token = jwt.sign(
    { id: user._id, isAdmin: user.isAdmin, isArtisan: user.isArtisan },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
  
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
  );
  
  return { token, refreshToken };
};

// Send response with tokens
const sendAuthResponse = (user, statusCode, res) => {
  const { token, refreshToken } = generateTokens(user);
  
  user.refreshToken = refreshToken;
  user.save({ validateBeforeSave: false });
  
  res.status(statusCode).json({
    status: 'success',
    token,
    refreshToken,
    data: {
      user: {
        _id: user._id,
        userName: user.userName,
        email: user.email,
        isAdmin: user.isAdmin,
        isArtisan: user.isArtisan,
        isVerified: user.isVerified
      }
    }
  });
};

// OTP generation
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

export const register = async (req, res) => {
  try {
    const { email, userName, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { userName }] });
    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message: 'User with this email or username already exists'
      });
    }

    // Create unverified user
    const user = await User.create({
      ...req.body,
      password,
      isVerified: false,
      authProvider: 'local'
    });

    // Generate and save OTP
    const otp = generateOTP();
    user.emailVerificationOTP = otp;
    user.emailVerificationOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send verification email
    await sendOTPEmail(email, otp);

    res.status(201).json({
      status: 'success',
      message: 'OTP sent to email',
      data: { userId: user._id }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    
    const user = await User.findOne({
      _id: userId,
      emailVerificationOTP: otp,
      emailVerificationOTPExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid or expired OTP'
      });
    }

    // Mark as verified
    user.isVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationOTPExpires = undefined;
    await user.save();

    sendAuthResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password'
      });
    }

    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password +refreshToken +loginAttempts +isBlocked');
    
    if (!user || !(await user.comparePassword(password))) {
      // Increment failed attempts
      if (user) {
        user.loginAttempts += 1;
        if (user.loginAttempts >= 3) {
          user.isBlocked = true;
          user.blockExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
        }
        await user.save();
      }
      
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }

    // 3) Check if account is blocked
    if (user.isBlocked && user.blockExpires > Date.now()) {
      return res.status(403).json({
        status: 'fail',
        message: `Account temporarily locked. Try again in ${Math.round((user.blockExpires - Date.now()) / 60000)} minutes`
      });
    }

    // 4) Check if email is verified
    if (!user.isVerified) {
      // Resend OTP if not verified
      const otp = generateOTP();
      user.emailVerificationOTP = otp;
      user.emailVerificationOTPExpires = Date.now() + 10 * 60 * 1000;
      await user.save();
      
      await sendOTPEmail(user.email, otp);
      
      return res.status(403).json({
        status: 'fail',
        message: 'Email not verified. New OTP sent',
        data: { userId: user._id }
      });
    }

    // 5) Reset login attempts on successful login
    user.loginAttempts = 0;
    user.isBlocked = false;
    user.blockExpires = undefined;
    await user.save();

    // 6) If everything ok, send token to client
    sendAuthResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const googleAuth = async (req, res) => {
  try {
    console.log('--- GOOGLE AUTH REQUEST RECEIVED ---');
    const { code } = req.body;

    if (!code) {
      console.log('Error: No authorization code provided in request body');
      return res.status(400).json({
        status: 'fail',
        message: 'Authorization code not provided'
      });
    }

    console.log('Received auth code:', code.substring(0, 10) + '...');

    // Exchange the authorization code for tokens
    const { tokens } = await client.getToken({
      code,
      redirect_uri: process.env.FRONTEND_URL || 'http://localhost:3000'
    });
    
    const idToken = tokens.id_token;

    if (!idToken) {
      return res.status(400).json({
        status: 'fail',
        message: 'Failed to retrieve ID token from authorization code'
      });
    }

    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new Google-authenticated user
      user = await User.create({
        email,
        googleId,
        userName: email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 8),
        fullName: name,
        imageUrl: picture,
        isVerified: true,
        authProvider: 'google',
        isArtisan: false,
        isAdmin: false,
        balance: 0
      });
    } else if (user.authProvider !== 'google') {
      return res.status(400).json({
        status: 'fail',
        message: 'Account exists with different login method',
        data: {
          authProvider: user.authProvider // 'local' or other provider
        }
      });
    } else {
      // Update user's profile picture if they signed in with Google again
      user.imageUrl = picture;
      user.fullName = name;
      await user.save();
    }

    // Generate tokens and respond
    const { token, refreshToken } = generateTokens(user);

    res.status(200).json({
      status: 'success',
      token,
      refreshToken,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          userName: user.userName,
          fullName: user.fullName,
          imageUrl: user.imageUrl,
          isAdmin: user.isAdmin,
          isArtisan: user.isArtisan,
          isVerified: user.isVerified,
          authProvider: user.authProvider,
          joiningDate: user.joiningDate,
          balance: user.balance
        }
      }
    });

  } catch (error) {
    console.error('Google Auth Error:', error.message);
    res.status(400).json({
      status: 'fail',
      message: error.message || 'Google authentication failed'
    });
  }
};

export const linkGoogleAccount = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({
        status: 'fail',
        message: 'Authorization code not provided'
      });
    }

    // Exchange the authorization code for tokens
    const { tokens } = await client.getToken({
      code,
      redirect_uri: process.env.FRONTEND_URL || 'http://localhost:3000'
    });
    
    const idToken = tokens.id_token;

    if (!idToken) {
      return res.status(400).json({
        status: 'fail',
        message: 'Failed to retrieve ID token from authorization code'
      });
    }

    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, sub: googleId } = payload;

    // Check if user exists and matches logged in user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    if (user.email !== email) {
      return res.status(400).json({
        status: 'fail',
        message: 'Google account email does not match your account email'
      });
    }

    // Check if Google account is already linked to another user
    const existingGoogleUser = await User.findOne({ googleId });
    if (existingGoogleUser) {
      return res.status(400).json({
        status: 'fail',
        message: 'This Google account is already linked to another user'
      });
    }

    // Link the Google account
    user.googleId = googleId;
    user.authProvider = 'both'; // Or keep as 'local' and just add googleId
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Google account linked successfully'
    });

  } catch (error) {
    console.error('Link Google Error:', error.message);
    res.status(400).json({
      status: 'fail',
      message: error.message || 'Failed to link Google account'
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'No user with that email address'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `Forgot your password? Click this link to reset your password: ${resetUrl}\nIf you didn't request this, please ignore this email.`;

    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    res.status(500).json({
      status: 'fail',
      message: 'Error sending email. Try again later!'
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    // 1) Get user based on the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message: 'Token is invalid or has expired'
      });
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Instead of logging the user in, send a success message.
    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully. Please log in.'
    });

  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        status: 'fail',
        message: 'No refresh token provided'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || refreshToken !== user.refreshToken) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin, isArtisan: user.isArtisan },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      status: 'success',
      token
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const protect = async (req, res, next) => {
  try {
    let token;
    
    // 1) Getting token and check if it's there
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // 2) Verification token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'fail',
        message: 'User recently changed password! Please log in again.'
      });
    }

    req.user = currentUser;
    next();
  } catch (err) {
    res.status(401).json({
      status: 'fail',
      message: err.message
    });
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Get current user with fresh data from database
export const getCurrentUser = async (req, res) => {
  try {
    // req.user is set by the protect middleware with current DB data
    const user = req.user;
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          _id: user._id,
          userName: user.userName,
          email: user.email,
          fullName: user.fullName,
          imageUrl: user.imageUrl,
          isAdmin: user.isAdmin,
          isArtisan: user.isArtisan,
          isVerified: user.isVerified,
          balance: user.balance,
          joiningDate: user.joiningDate,
          authProvider: user.authProvider
        }
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      status: 'fail',
      message: 'Failed to get current user data'
    });
  }
};
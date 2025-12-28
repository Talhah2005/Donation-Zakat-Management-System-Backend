import User from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/passwordUtils.js';
import { generateToken } from '../middleware/authMiddleware.js';
import { sendEmail, generateOTP } from '../utils/mail.js';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
export const signup = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Generate verification token
        const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        // Create new user
        const user = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            role: 'user', // Default role
            verificationToken,
            isVerified: false
        });

        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
        const message = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #5cb85c; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Saylani Welfare Trust</h1>
                </div>
                <div style="padding: 30px; line-height: 1.6; color: #333;">
                    <h2>Welcome to our Community, ${name}!</h2>
                    <p>Thank you for signing up. To complete your registration and start your donation journey, please verify your email address by clicking the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" style="background-color: #5cb85c; color: white; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">Verify My Account</a>
                    </div>
                    <p>Or copy and paste this link in your browser:</p>
                    <p style="word-break: break-all; color: #888;">${verificationUrl}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="font-size: 12px; color: #999;">If you didn't create this account, you can safely ignore this email.</p>
                </div>
                <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #888;">
                    © ${new Date().getFullYear()} Saylani Welfare. All rights reserved.
                </div>
            </div>
        `;

        try {
            await sendEmail({
                to: user.email,
                subject: 'Verify Your Email - Saylani Welfare',
                html: message,
                text: `Welcome to Saylani Welfare! Please verify your account by visiting: ${verificationUrl}`
            });

            res.status(201).json({
                success: true,
                message: 'Registration successful! Please check your email to verify your account.'
            });
        } catch (mailError) {
            // Delete user if email fails so they can try again
            await User.findByIdAndDelete(user._id);
            return res.status(500).json({
                success: false,
                message: 'Email could not be sent. Please try again.',
                error: mailError.message
            });
        }
    } catch (error) {

        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user is verified
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Please verify your email address before logging in. Check your inbox for a verification email.'
            });
        }

        // Compare passwords
        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role
                },
                token
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');

        res.status(200).json({
            success: true,
            data: {
                user
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user profile',
            error: error.message
        });
    }
};

/**
 * @desc    Forgot Password - Send OTP to email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No user found with this email address'
            });
        }

        // Generate 6-digit OTP
        const otp = generateOTP();

        // Save OTP and expiry (10 minutes)
        user.resetPasswordOTP = otp;
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        // Send email
        const message = `
            <h1>Password Reset OTP</h1>
            <p>You requested a password reset. Please use the following OTP (One-Time Password) to reset your password:</p>
            <h2 style="color: #5cb85c; font-size: 32px; letter-spacing: 5px;">${otp}</h2>
            <p>This OTP is valid for 10 minutes only.</p>
            <p>If you did not request this, please ignore this email.</p>
            <hr />
            <p>Regards,<br />Saylani Welfare Team</p>
        `;

        try {
            await sendEmail({
                to: user.email,
                subject: 'Password Reset OTP - Saylani Welfare',
                html: message,
                text: `Your password reset OTP is: ${otp}. Valid for 10 minutes.`
            });

            res.status(200).json({
                success: true,
                message: 'OTP sent to email'
            });
        } catch (mailError) {
            user.resetPasswordOTP = null;
            user.resetPasswordExpires = null;
            await user.save();

            return res.status(500).json({
                success: false,
                message: 'Email could not be sent',
                error: mailError.message
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error in forgot password',
            error: error.message
        });
    }
};

/**
 * @desc    Reset Password - Verify OTP and update password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        // Find user
        const user = await User.findOne({
            email,
            resetPasswordOTP: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);
        user.password = hashedPassword;

        // Clear OTP fields
        user.resetPasswordOTP = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successful. You can now login with your new password.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error in reset password',
            error: error.message
        });
    }
};

/**
 * @desc    Verify Email
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        // Find user by token
        const user = await User.findOne({ verificationToken: token });

        if (!user) {
            // If we can't find a user with this token, they are likely already verified 
            // because we set verificationToken to null upon successful verification.
            return res.status(200).json({
                success: true,
                message: 'Your account is already verified! You can proceed to login.'
            });
        }

        // Update user status
        user.isVerified = true;
        user.verificationToken = null;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Email verified successfully! You can now login to your account.'
        });
    } catch (error) {

        res.status(500).json({
            success: false,
            message: 'Error verifying email',
            error: error.message
        });
    }
};



import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { generateToken } from '../middleware/authMiddleware.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * @desc    Authenticate with Google
 * @route   POST /api/auth/google
 * @access  Public
 */
export const googleAuth = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                success: false,
                message: 'Google credential (ID Token) is required'
            });
        }

        // Verify the ID token from Google
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture } = payload;

        // 1. Check if user exists by email
        let user = await User.findOne({ email });

        if (user) {
            // 2. Account Hijacking Protection: Check if existing user is local
            if (user.authProvider === 'local') {
                return res.status(400).json({
                    success: false,
                    message: 'This email is already registered with a password. Please log in using your password.'
                });
            }

            // 3. If user exists but googleId is missing (unlikely but possible), sync it
            if (!user.googleId) {
                user.googleId = googleId;
                user.picture = picture;
                await user.save();
            }
        } else {
            // 4. Create new user for Google login (Auto-Signup)
            user = await User.create({
                name,
                email,
                googleId,
                picture,
                authProvider: 'google',
                isVerified: true, // Google emails are already verified
                role: 'user'
            });
        }

        // 5. Generate app JWT
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Google login successful',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    picture: user.picture
                },
                token
            }
        });

    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid Google token',
            error: error.message
        });
    }
};

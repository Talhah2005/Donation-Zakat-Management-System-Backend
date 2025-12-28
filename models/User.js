import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters long']
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
        },
        phone: {
            type: String,
            required: function () { return this.authProvider === 'local'; },
            trim: true,
            match: [/^[0-9]{10,15}$/, 'Please provide a valid phone number']
        },
        password: {
            type: String,
            required: function () { return this.authProvider === 'local'; },
            minlength: [6, 'Password must be at least 6 characters long']
            // Note: Password will be hashed before saving
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true
        },
        picture: {
            type: String,
            default: null
        },
        authProvider: {
            type: String,
            enum: ['local', 'google'],
            default: 'local'
        },
        resetPasswordOTP: {
            type: String,
            default: null
        },
        resetPasswordExpires: {
            type: Date,
            default: null
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        verificationToken: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true // Automatically adds createdAt and updatedAt
    }
);

// Note: email index is automatically created by unique: true property

const User = mongoose.model('User', userSchema);

export default User;

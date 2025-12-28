import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Campaign name is required'],
            trim: true,
            minlength: [3, 'Campaign name must be at least 3 characters long']
        },
        description: {
            type: String,
            required: [true, 'Campaign description is required'],
            trim: true
        },
        goalAmount: {
            type: Number,
            required: [true, 'Goal amount is required'],
            min: [1, 'Goal amount must be at least 1']
        },
        currentAmount: {
            type: Number,
            default: 0,
            min: 0
        },
        deadline: {
            type: Date,
            required: [true, 'Campaign deadline is required'],
            validate: {
                validator: function (value) {
                    return value > new Date();
                },
                message: 'Deadline must be a future date'
            }
        },
        isActive: {
            type: Boolean,
            default: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Creator ID is required']
        }
    },
    {
        timestamps: true
    }
);

// Index for active campaigns
campaignSchema.index({ isActive: 1, deadline: 1 });

// Virtual field to calculate progress percentage
campaignSchema.virtual('progressPercentage').get(function () {
    return this.goalAmount > 0 ? Math.round((this.currentAmount / this.goalAmount) * 100) : 0;
});

// Ensure virtuals are included in JSON
campaignSchema.set('toJSON', { virtuals: true });
campaignSchema.set('toObject', { virtuals: true });

const Campaign = mongoose.model('Campaign', campaignSchema);

export default Campaign;

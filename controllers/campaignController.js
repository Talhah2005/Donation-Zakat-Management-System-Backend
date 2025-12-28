import Campaign from '../models/Campaign.js';

/**
 * @desc    Create a new campaign (admin only)
 * @route   POST /api/campaigns
 * @access  Private/Admin
 */
export const createCampaign = async (req, res) => {
    try {
        const { name, description, goalAmount, deadline } = req.body;
        const createdBy = req.user._id;

        const campaign = await Campaign.create({
            name,
            description,
            goalAmount,
            currentAmount: 0,
            deadline,
            isActive: true,
            createdBy
        });

        res.status(201).json({
            success: true,
            message: 'Campaign created successfully',
            data: {
                campaign
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating campaign',
            error: error.message
        });
    }
};

/**
 * @desc    Get all campaigns
 * @route   GET /api/campaigns
 * @access  Public/Private
 */
export const getAllCampaigns = async (req, res) => {
    try {
        const { isActive } = req.query;

        const filter = {};
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const campaigns = await Campaign.find(filter)
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: campaigns.length,
            data: {
                campaigns
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching campaigns',
            error: error.message
        });
    }
};

/**
 * @desc    Get active campaigns only
 * @route   GET /api/campaigns/active
 * @access  Public
 */
export const getActiveCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find({
            isActive: true,
            deadline: { $gt: new Date() } // Only future deadlines
        }).sort({ deadline: 1 });

        res.status(200).json({
            success: true,
            count: campaigns.length,
            data: {
                campaigns
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching active campaigns',
            error: error.message
        });
    }
};

/**
 * @desc    Get campaign by ID
 * @route   GET /api/campaigns/:id
 * @access  Public/Private
 */
export const getCampaignById = async (req, res) => {
    try {
        const { id } = req.params;

        const campaign = await Campaign.findById(id).populate('createdBy', 'name');

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                campaign
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching campaign',
            error: error.message
        });
    }
};

/**
 * @desc    Update campaign (admin only)
 * @route   PATCH /api/campaigns/:id
 * @access  Private/Admin
 */
export const updateCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Don't allow updating currentAmount directly (only through donations)
        delete updates.currentAmount;

        const campaign = await Campaign.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        );

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Campaign updated successfully',
            data: {
                campaign
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating campaign',
            error: error.message
        });
    }
};

/**
 * @desc    Delete campaign (admin only)
 * @route   DELETE /api/campaigns/:id
 * @access  Private/Admin
 */
export const deleteCampaign = async (req, res) => {
    try {
        const { id } = req.params;

        const campaign = await Campaign.findByIdAndDelete(id);

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Campaign deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting campaign',
            error: error.message
        });
    }
};

import Donation from '../models/Donation.js';
import Campaign from '../models/Campaign.js';
import Receipt from '../models/Receipt.js';
import User from '../models/User.js';

/**
 * @desc    Create a new donation
 * @route   POST /api/donations
 * @access  Private
 */
export const createDonation = async (req, res) => {
    try {
        const { amount, type, category, paymentMethod, campaignId } = req.body;
        const userId = req.user._id;

        // Create donation
        const donation = await Donation.create({
            userId,
            amount,
            type,
            category,
            paymentMethod,
            campaignId: campaignId || null,
            // Only 'Cash' payments are initially 'Pending' and require admin verification.
            // Online (Stripe) and Bank payments are considered pre-verified or secure.
            status: (paymentMethod === 'Online' || paymentMethod === 'Bank') ? 'Verified' : 'Pending'
        });

        // If donation is Verified immediately (Online/Bank), update campaign amount
        if (campaignId && donation.status === 'Verified') {
            await Campaign.findByIdAndUpdate(campaignId, {
                $inc: { currentAmount: amount }
            });
        }

        // Generate receipt
        const user = await User.findById(userId);
        const receiptNumber = `RCP-${Date.now()}-${donation._id.toString().slice(-6).toUpperCase()}`;

        const receipt = await Receipt.create({
            donationId: donation._id,
            receiptNumber,
            donorName: user.name,
            amount,
            date: new Date(),
            donationType: type,
            donationCategory: category
        });

        // Update donation with receipt ID
        donation.receiptId = receipt._id;
        await donation.save();

        res.status(201).json({
            success: true,
            message: 'Donation created successfully',
            data: {
                donation: await donation.populate('campaignId', 'name'),
                receipt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating donation',
            error: error.message
        });
    }
};

/**
 * @desc    Get all donations (admin only)
 * @route   GET /api/donations
 * @access  Private/Admin
 */
export const getAllDonations = async (req, res) => {
    try {
        const { status, type, category, paymentMethod, search } = req.query;

        // Build filter object
        const filter = {};
        if (status) filter.status = status;
        if (type) filter.type = type;
        if (category) filter.category = category;
        if (paymentMethod) filter.paymentMethod = paymentMethod;

        const donations = await Donation.find(filter)
            .populate('userId', 'name email phone')
            .populate('campaignId', 'name')
            .populate('receiptId')
            .sort({ createdAt: -1 });

        // Apply search filter if provided
        let filteredDonations = donations;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredDonations = donations.filter(donation => {
                const nameMatch = (donation.userId?.name || donation.receiptId?.donorName || '').toLowerCase().includes(searchLower);
                const emailMatch = (donation.userId?.email || '').toLowerCase().includes(searchLower);
                const phoneMatch = (donation.userId?.phone || '').includes(search);
                return nameMatch || emailMatch || phoneMatch;
            });
        }

        res.status(200).json({
            success: true,
            count: filteredDonations.length,
            data: {
                donations: filteredDonations
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching donations',
            error: error.message
        });
    }
};

/**
 * @desc    Get donations by user ID
 * @route   GET /api/donations/user/:userId
 * @access  Private
 */
export const getUserDonations = async (req, res) => {
    try {
        const { userId } = req.params;

        const donations = await Donation.find({ userId })
            .populate('campaignId', 'name')
            .populate('receiptId')
            .sort({ createdAt: -1 });

        // Calculate total donations
        const totalAmount = donations.reduce((sum, donation) => sum + donation.amount, 0);

        res.status(200).json({
            success: true,
            count: donations.length,
            data: {
                donations,
                totalAmount
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user donations',
            error: error.message
        });
    }
};

/**
 * @desc    Update donation status (admin only)
 * @route   PATCH /api/donations/:id/status
 * @access  Private/Admin
 */
export const updateDonationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const donation = await Donation.findById(id).populate('campaignId');

        if (!donation) {
            return res.status(404).json({
                success: false,
                message: 'Donation not found'
            });
        }

        // If status is changing from Pending to Verified, update campaign amount
        if (donation.status === 'Pending' && status === 'Verified') {
            if (donation.campaignId) {
                await Campaign.findByIdAndUpdate(donation.campaignId._id, {
                    $inc: { currentAmount: donation.amount }
                });
            }
        }
        // If status is changing from Verified to Pending, decrement campaign amount
        else if (donation.status === 'Verified' && status === 'Pending') {
            if (donation.campaignId) {
                await Campaign.findByIdAndUpdate(donation.campaignId._id, {
                    $inc: { currentAmount: -donation.amount }
                });
            }
        }

        donation.status = status;
        await donation.save();

        res.status(200).json({
            success: true,
            message: `Donation status updated to ${status} successfully`,
            data: {
                donation: await donation.populate('userId', 'name email')
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating donation status',
            error: error.message
        });
    }
};

/**
 * @desc    Get donation by ID
 * @route   GET /api/donations/:id
 * @access  Private
 */
export const getDonationById = async (req, res) => {
    try {
        const { id } = req.params;

        const donation = await Donation.findById(id)
            .populate('userId', 'name email phone')
            .populate('campaignId', 'name')
            .populate('receiptId');

        if (!donation) {
            return res.status(404).json({
                success: false,
                message: 'Donation not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                donation
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching donation',
            error: error.message
        });
    }
};

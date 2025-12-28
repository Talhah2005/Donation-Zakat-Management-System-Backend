import Donation from '../models/Donation.js';
import User from '../models/User.js';
import Campaign from '../models/Campaign.js';

/**
 * @desc    Get user dashboard data
 * @route   GET /api/dashboard/user/:userId
 * @access  Private
 */
export const getUserDashboard = async (req, res) => {
    try {
        const { userId } = req.params;

        // Get all donations by user
        const donations = await Donation.find({ userId })
            .populate('campaignId', 'name')
            .populate('receiptId')
            .sort({ createdAt: -1 });

        // Calculate statistics
        const totalDonations = donations.length;
        const totalAmount = donations.reduce((sum, donation) => sum + donation.amount, 0);
        const verifiedDonations = donations.filter(d => d.status === 'Verified').length;
        const pendingDonations = donations.filter(d => d.status === 'Pending').length;

        // Group by type
        const donationsByType = {
            Zakat: donations.filter(d => d.type === 'Zakat').reduce((sum, d) => sum + d.amount, 0),
            Sadqah: donations.filter(d => d.type === 'Sadqah').reduce((sum, d) => sum + d.amount, 0),
            Fitra: donations.filter(d => d.type === 'Fitra').reduce((sum, d) => sum + d.amount, 0),
            General: donations.filter(d => d.type === 'General').reduce((sum, d) => sum + d.amount, 0)
        };

        res.status(200).json({
            success: true,
            data: {
                statistics: {
                    totalDonations,
                    totalAmount,
                    verifiedDonations,
                    pendingDonations,
                    donationsByType
                },
                donations
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user dashboard data',
            error: error.message
        });
    }
};

/**
 * @desc    Get admin dashboard data
 * @route   GET /api/dashboard/admin
 * @access  Private/Admin
 */
export const getAdminDashboard = async (req, res) => {
    try {
        // Get all donations
        const allDonations = await Donation.find()
            .populate('userId', 'name email phone')
            .populate('campaignId', 'name')
            .sort({ createdAt: -1 });

        // Get all users (excluding admins)
        const allDonors = await User.find({ role: 'user' }).select('-password');

        // Get all campaigns
        const allCampaigns = await Campaign.find();

        // Calculate statistics
        const totalDonations = allDonations.length;
        const totalAmount = allDonations.reduce((sum, d) => sum + d.amount, 0);
        const totalDonors = allDonors.length;
        const pendingDonations = allDonations.filter(d => d.status === 'Pending').length;
        const verifiedDonations = allDonations.filter(d => d.status === 'Verified').length;
        const activeCampaigns = allCampaigns.filter(c => c.isActive).length;

        // Recent donations (last 10)
        const recentDonations = allDonations.slice(0, 10);

        // Donations by payment method
        const donationsByPaymentMethod = {
            Cash: allDonations.filter(d => d.paymentMethod === 'Cash').length,
            Bank: allDonations.filter(d => d.paymentMethod === 'Bank').length,
            Online: allDonations.filter(d => d.paymentMethod === 'Online').length
        };

        // Donations by category
        const donationsByCategory = {
            Food: allDonations.filter(d => d.category === 'Food').reduce((sum, d) => sum + d.amount, 0),
            Education: allDonations.filter(d => d.category === 'Education').reduce((sum, d) => sum + d.amount, 0),
            Medical: allDonations.filter(d => d.category === 'Medical').reduce((sum, d) => sum + d.amount, 0)
        };

        res.status(200).json({
            success: true,
            data: {
                statistics: {
                    totalDonations,
                    totalAmount,
                    totalDonors,
                    pendingDonations,
                    verifiedDonations,
                    activeCampaigns,
                    donationsByPaymentMethod,
                    donationsByCategory
                },
                recentDonations,
                campaigns: allCampaigns
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching admin dashboard data',
            error: error.message
        });
    }
};

/**
 * @desc    Get all donors with their donation summary (admin only)
 * @route   GET /api/dashboard/admin/donors
 * @access  Private/Admin
 */
export const getAllDonors = async (req, res) => {
    try {
        const donors = await User.find({ role: 'user' }).select('-password');

        // Get donation summary for each donor
        const donorsWithSummary = await Promise.all(
            donors.map(async (donor) => {
                const donations = await Donation.find({ userId: donor._id });
                const totalDonations = donations.length;
                const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);

                return {
                    ...donor.toObject(),
                    donationSummary: {
                        totalDonations,
                        totalAmount
                    }
                };
            })
        );

        res.status(200).json({
            success: true,
            count: donorsWithSummary.length,
            data: {
                donors: donorsWithSummary
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching donors',
            error: error.message
        });
    }
};

import PDFDocument from 'pdfkit';
import Receipt from '../models/Receipt.js';
import Donation from '../models/Donation.js';
import axios from 'axios';

// Saylani Brand Colors - Matching your website theme
const COLORS = {
    primary: '#5cb85c',      // Saylani Green (matches your website)
    primaryDark: '#47a447',  // Darker Green for accents
    primaryLight: '#e8f5e8', // Light Green for backgrounds
    dark: '#1a1a1a',
    lightGray: '#f5f5f5',
    mediumGray: '#666666',
    white: '#ffffff',
    border: '#d9d9d9'
};

// Saylani Logo URL
const LOGO_URL = 'https://covid19.unitedpeople.global/wp-content/uploads/2020/10/Saylani.jpg';

/**
 * @desc    Get receipt by donation ID
 * @route   GET /api/receipts/donation/:donationId
 * @access  Private
 */
export const getReceiptByDonation = async (req, res) => {
    try {
        console.log('📄 Fetching receipt for donation:', req.params.donationId);
        const { donationId } = req.params;

        const receipt = await Receipt.findOne({ donationId }).populate('donationId');

        if (!receipt) {
            console.log('❌ Receipt not found');
            return res.status(404).json({
                success: false,
                message: 'Receipt not found'
            });
        }

        console.log('✅ Receipt found:', receipt.receiptNumber);
        res.status(200).json({
            success: true,
            data: {
                receipt
            }
        });
    } catch (error) {
        console.error('❌ Error fetching receipt:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching receipt',
            error: error.message
        });
    }
};

/**
 * @desc    Download receipt as PDF
 * @route   GET /api/receipts/download/:receiptId
 * @access  Private
 */
export const downloadReceipt = async (req, res) => {
    try {
        console.log('📥 Generating PDF receipt for:', req.params.receiptId);
        const { receiptId } = req.params;

        const receipt = await Receipt.findById(receiptId)
            .populate({
                path: 'donationId',
                populate: {
                    path: 'userId',
                    select: 'name email phone'
                }
            });

        if (!receipt) {
            console.log('❌ Receipt not found');
            return res.status(404).json({
                success: false,
                message: 'Receipt not found'
            });
        }

        // Create PDF document with custom settings
        const doc = new PDFDocument({ 
            margin: 0,
            size: 'A4',
            bufferPages: true
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Saylani-Receipt-${receipt.receiptNumber}.pdf`);

        // Pipe PDF to response
        doc.pipe(res);

        // ==============================================
        // HEADER SECTION WITH SAYLANI GREEN
        // ==============================================
        doc
            .rect(0, 0, 612, 140)
            .fill(COLORS.primary);

        // Try to load and add logo
        try {
            const logoResponse = await axios.get(LOGO_URL, { 
                responseType: 'arraybuffer',
                timeout: 5000 
            });
            const logoBuffer = Buffer.from(logoResponse.data, 'binary');
            
            // Add logo (positioned on the left)
            doc.image(logoBuffer, 40, 25, { 
                width: 60,
                height: 60 
            });

            // Organization name next to logo
            doc
                .fontSize(22)
                .fillColor(COLORS.white)
                .font('Helvetica-Bold')
                .text('SAYLANI WELFARE', 115, 32);

            doc
                .fontSize(10)
                .font('Helvetica')
                .text('INTERNATIONAL TRUST', 115, 56);

            doc
                .fontSize(9)
                .font('Helvetica')
                .text('Transforming Lives Through Giving', 115, 70);

        } catch (logoError) {
            console.log('⚠️ Could not load logo, using text fallback');
            // Fallback if logo fails to load
            doc
                .fontSize(26)
                .fillColor(COLORS.white)
                .font('Helvetica-Bold')
                .text('SAYLANI WELFARE', 40, 30);

            doc
                .fontSize(11)
                .font('Helvetica')
                .text('INTERNATIONAL TRUST', 40, 60);
            
            doc
                .fontSize(9)
                .text('Transforming Lives Through Giving', 40, 75);
        }

        // Receipt Title - Centered
        doc
            .fontSize(24)
            .font('Helvetica-Bold')
            .fillColor(COLORS.white)
            .text('DONOR RECEIPT', 0, 105, { align: 'center' });

        // ==============================================
        // RECEIPT INFO SECTION (COMPACT)
        // ==============================================
        let currentY = 160;

        // Light background box for receipt info
        doc
            .rect(30, currentY, 552, 45)
            .fill(COLORS.primaryLight);

        // Receipt Number (left)
        doc
            .fontSize(8)
            .fillColor(COLORS.mediumGray)
            .font('Helvetica')
            .text('RECEIPT NUMBER', 45, currentY + 10);

        doc
            .fontSize(13)
            .fillColor(COLORS.primary)
            .font('Helvetica-Bold')
            .text(receipt.receiptNumber, 45, currentY + 24, { width: 240, ellipsis: true });

        // Issue Date (right)
        doc
            .fontSize(8)
            .fillColor(COLORS.mediumGray)
            .font('Helvetica')
            .text('ISSUE DATE', 340, currentY + 10);

        doc
            .fontSize(13)
            .fillColor(COLORS.dark)
            .font('Helvetica-Bold')
            .text(new Date(receipt.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }), 340, currentY + 24);

        // ==============================================
        // DONOR INFORMATION SECTION (COMPACT)
        // ==============================================
        currentY = 225;

        // Section Title
        doc
            .fontSize(10)
            .fillColor(COLORS.primary)
            .font('Helvetica-Bold')
            .text('DONOR INFORMATION', 30, currentY);

        currentY += 18;

        // Donor Details Box with border
        doc
            .roundedRect(30, currentY, 552, 75, 5)
            .lineWidth(1.5)
            .strokeColor(COLORS.primary)
            .stroke();

        currentY += 12;

        // Get donor info from populated data
        const donorName = receipt.donationId?.userId?.name || receipt.donorName || 'N/A';
        const donorEmail = receipt.donationId?.userId?.email || receipt.donationId?.donorEmail || 'N/A';
        const donorPhone = receipt.donationId?.userId?.phone || 'N/A';

        // Donor Name
        doc
            .fontSize(8)
            .fillColor(COLORS.mediumGray)
            .font('Helvetica')
            .text('FULL NAME', 45, currentY);

        doc
            .fontSize(12)
            .fillColor(COLORS.dark)
            .font('Helvetica-Bold')
            .text(donorName, 45, currentY + 13, { width: 240, ellipsis: true });

        // Email
        doc
            .fontSize(8)
            .fillColor(COLORS.mediumGray)
            .font('Helvetica')
            .text('EMAIL ADDRESS', 45, currentY + 35);

        doc
            .fontSize(9)
            .fillColor(COLORS.primary)
            .font('Helvetica')
            .text(donorEmail, 45, currentY + 48, { width: 240, ellipsis: true });

        // Phone (right side)
        if (donorPhone && donorPhone !== 'N/A') {
            doc
                .fontSize(8)
                .fillColor(COLORS.mediumGray)
                .font('Helvetica')
                .text('PHONE NUMBER', 340, currentY + 35);

            doc
                .fontSize(9)
                .fillColor(COLORS.dark)
                .font('Helvetica')
                .text(donorPhone, 340, currentY + 48);
        }

        // ==============================================
        // DONATION DETAILS SECTION (COMPACT)
        // ==============================================
        currentY = 330;

        // Section Title
        doc
            .fontSize(10)
            .fillColor(COLORS.primary)
            .font('Helvetica-Bold')
            .text('DONATION DETAILS', 30, currentY);

        currentY += 18;

        // Three compact detail boxes
        const boxWidth = 174;
        const boxHeight = 50;
        const detailsData = [
            { label: 'DONATION TYPE', value: receipt.donationType },
            { label: 'CATEGORY', value: receipt.donationCategory },
            { label: 'PAYMENT METHOD', value: receipt.donationId?.paymentMethod || 'N/A' }
        ];

        detailsData.forEach((item, index) => {
            const xPos = 30 + (index * (boxWidth + 4));
            
            // Box background
            doc
                .rect(xPos, currentY, boxWidth, boxHeight)
                .fill(COLORS.primaryLight);

            // Label
            doc
                .fontSize(7)
                .fillColor(COLORS.mediumGray)
                .font('Helvetica')
                .text(item.label, xPos + 10, currentY + 10);

            // Value
            doc
                .fontSize(11)
                .fillColor(COLORS.dark)
                .font('Helvetica-Bold')
                .text(item.value, xPos + 10, currentY + 27, { 
                    width: boxWidth - 20,
                    ellipsis: true 
                });
        });

        // ==============================================
        // AMOUNT SECTION (PROMINENT GREEN BOX)
        // ==============================================
        currentY = 400;

        doc
            .roundedRect(30, currentY, 552, 65, 8)
            .fill(COLORS.primary);

        doc
            .fontSize(10)
            .fillColor(COLORS.white)
            .font('Helvetica')
            .text('TOTAL DONATION AMOUNT', 0, currentY + 15, { align: 'center' });

        doc
            .fontSize(32)
            .fillColor(COLORS.white)
            .font('Helvetica-Bold')
            .text(`Rs. ${receipt.amount.toLocaleString()}`, 0, currentY + 30, { align: 'center' });

        // ==============================================
        // THANK YOU MESSAGE (COMPACT)
        // ==============================================
        currentY = 485;

        doc
            .roundedRect(30, currentY, 552, 60, 6)
            .lineWidth(1.5)
            .strokeColor(COLORS.primary)
            .stroke();

        // Use proper Unicode for Arabic text
        doc
            .fontSize(11)
            .fillColor(COLORS.primary)
            .font('Helvetica-Bold')
            .text('JazakAllah Khairan', 0, currentY + 12, { align: 'center' });

        doc
            .fontSize(10)
            .fillColor(COLORS.dark)
            .font('Helvetica-Bold')
            .text('Thank you for your generous donation!', 0, currentY + 30, { align: 'center' });

        doc
            .fontSize(8)
            .fillColor(COLORS.mediumGray)
            .font('Helvetica')
            .text('May Allah accept your donation and reward you abundantly.', 0, currentY + 46, { align: 'center' });

        // ==============================================
        // IMPORTANT NOTICE (COMPACT)
        // ==============================================
        currentY = 560;

        doc
            .rect(30, currentY, 552, 45)
            .fill(COLORS.lightGray);

        doc
            .fontSize(7)
            .fillColor(COLORS.mediumGray)
            .font('Helvetica-Bold')
            .text('IMPORTANT NOTICE', 0, currentY + 10, { align: 'center' });

        doc
            .fontSize(7)
            .font('Helvetica')
            .text(
                'This is a computer-generated receipt. Please retain for your records and tax purposes. ' +
                'For any queries, contact us at the information provided below.',
                40,
                currentY + 22,
                { width: 532, align: 'center' }
            );

        // ==============================================
        // FOOTER SECTION (COMPACT)
        // ==============================================
        const footerY = 750;

        // Green stripe
        doc
            .rect(0, footerY, 612, 15)
            .fill(COLORS.primary);

        // Dark footer
        doc
            .rect(0, footerY + 15, 612, 77)
            .fill(COLORS.dark);

        // Organization info
        doc
            .fontSize(9)
            .fillColor(COLORS.white)
            .font('Helvetica-Bold')
            .text('Saylani Welfare International Trust', 30, footerY + 25);

        doc
            .fontSize(7)
            .font('Helvetica')
            .text('A-25, Bahadurabad Chowrangi, Karachi, Pakistan', 30, footerY + 40)
            .text('Phone: +92-21-111-729-526  |  Email: info@saylaniwelfare.com', 30, footerY + 52);

        doc
            .fontSize(7)
            .fillColor(COLORS.mediumGray)
            .text('Web: www.saylaniwelfare.com', 30, footerY + 64);

        console.log('✅ PDF generated successfully for receipt:', receipt.receiptNumber);

        // Finalize PDF
        doc.end();
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating PDF',
            error: error.message
        });
    }
};
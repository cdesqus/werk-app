const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const { Op } = require('sequelize');

// Register Handlebars Helper
handlebars.registerHelper('formatCurrency', function (value) {
    if (isNaN(value)) return value;
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(value);
});

const getCutoffDates = (month, year) => {
    // 28th Previous Month to 27th Current Month
    let startMonthIndex = month - 2; // month is 1-indexed from input
    let startYear = year;

    if (startMonthIndex < 0) {
        startMonthIndex = 11;
        startYear = year - 1;
    }

    const startDate = new Date(startYear, startMonthIndex, 28);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(year, month - 1, 27);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
};

const calculatePayroll = async (models, userId, month, year, adjustments = []) => {
    const { User, Overtime, Claim } = models;
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    const { startDate, endDate } = getCutoffDates(parseInt(month), parseInt(year));

    // Fetch Data
    const overtimes = await Overtime.findAll({
        where: {
            UserId: userId,
            status: 'Approved',
            date: { [Op.between]: [startDate, endDate] }
        }
    });

    const claims = await Claim.findAll({
        where: {
            UserId: userId,
            status: 'Approved',
            date: { [Op.between]: [startDate, endDate] }
        }
    });

    // Calculations
    const overtimeTotal = overtimes.reduce((sum, ot) => sum + (ot.payableAmount || 0), 0);
    const overtimeHours = overtimes.reduce((sum, ot) => sum + (ot.hours || 0), 0);
    const claimTotal = claims.reduce((sum, c) => sum + (c.amount || 0), 0);

    // Base Salary
    const baseSalary = user.baseSalary || 0;

    // Adjustments
    const earningAdjustments = adjustments.filter(a => a.type === 'earning');
    const deductionAdjustments = adjustments.filter(a => a.type === 'deduction');

    const totalEarningsAdj = earningAdjustments.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const totalDeductionsAdj = deductionAdjustments.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);

    const grossPay = baseSalary + overtimeTotal + claimTotal + totalEarningsAdj;
    const netPay = grossPay - totalDeductionsAdj;

    return {
        user,
        period: {
            month,
            year,
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        },
        calculations: {
            baseSalary,
            overtimeTotal,
            overtimeHours,
            claimTotal,
            totalEarningsAdj,
            totalDeductionsAdj,
            grossPay,
            netPay,
            totalDeductions: totalDeductionsAdj
        },
        adjustments: {
            earnings: earningAdjustments,
            deductions: deductionAdjustments
        },
        rawData: {
            overtimes,
            claims
        }
    };
};

const generateHtml = async (payrollData) => {
    const templatePath = path.join(__dirname, '../templates/payslip.hbs');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);

    const html = template({
        user: payrollData.user,
        periodStart: payrollData.period.start,
        periodEnd: payrollData.period.end,
        paymentDate: new Date().toLocaleDateString('id-ID'),
        generatedDate: new Date().toLocaleString(),
        payslipId: `PS-${payrollData.user.staffId}-${payrollData.period.month}${payrollData.period.year}`,
        calculations: payrollData.calculations,
        earnings: payrollData.adjustments.earnings,
        deductions: payrollData.adjustments.deductions
    });

    return html;
};

const generatePdf = async (html) => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    return pdfBuffer;
};

const sendPayslip = async (models, transporter, userId, month, year, adjustments) => {
    const { Payslip } = models;

    // 1. Calculate
    const payrollData = await calculatePayroll(models, userId, month, year, adjustments);

    // 2. Generate HTML
    const html = await generateHtml(payrollData);

    // 3. Generate PDF
    const pdfBuffer = await generatePdf(html);

    // 4. Save to DB (Snapshot)
    const filename = `Payslip-${payrollData.user.staffId}-${month}-${year}.pdf`;
    // In a real app, upload title to S3/Cloudinary and get URL. 
    // Here we might just save to disk or store logic. 
    // For now, we save to local uploads if needed, or just store a marker.
    // The user requirement says "Save record to Payslip table".
    // "fileUrl" is required. Let's save to uploads folder.

    const filePath = path.join(__dirname, '../uploads', filename);
    fs.writeFileSync(filePath, pdfBuffer);

    const payslip = await Payslip.create({
        UserId: userId,
        month: parseInt(month),
        year: parseInt(year),
        periodStart: payrollData.period.start,
        periodEnd: payrollData.period.end,
        baseSalary: payrollData.calculations.baseSalary,
        totalOvertime: payrollData.calculations.overtimeTotal,
        totalClaim: payrollData.calculations.claimTotal,
        adjustments: adjustments, // Store raw adjustments JSON
        netPay: payrollData.calculations.netPay,
        fileUrl: `/uploads/${filename}`,
        status: 'Sent' // Since we are emailing it now
    });

    // 5. Send Email
    await transporter.sendMail({
        from: `"WERK Payroll" <${process.env.SMTP_USER}>`,
        to: payrollData.user.email,
        subject: `Payslip for Period ${payrollData.period.start} - ${payrollData.period.end}`,
        html: `
            <h3>Dear ${payrollData.user.name},</h3>
            <p>Please find attached your payslip for the period ${payrollData.period.start} to ${payrollData.period.end}.</p>
            <p><strong>Net Pay: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(payrollData.calculations.netPay)}</strong></p>
            <br>
            <p>Best Regards,<br>WERK Finance Team</p>
        `,
        attachments: [
            {
                filename: filename,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ]
    });

    return payslip;
};

module.exports = {
    calculatePayroll,
    generateHtml,
    generatePdf,
    sendPayslip
};

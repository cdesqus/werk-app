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
    const template = handlebars.compile(templateSource, {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    });

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
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--no-zygote',
            '--disable-extensions'
        ],
        timeout: 60000,
        dumpio: false
    });

    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();
        return pdfBuffer;
    } catch (error) {
        await browser.close();
        throw error;
    }
};

const sendPayslip = async (models, transporter, userId, month, year, adjustments) => {
    const { Payslip } = models;

    try {
        // 1. Calculate
        console.log(`[Payslip] Calculating payroll for User ID: ${userId}, Month: ${month}, Year: ${year}`);
        const payrollData = await calculatePayroll(models, userId, month, year, adjustments);

        // Ensure user data is properly serialized
        const userData = payrollData.user.toJSON ? payrollData.user.toJSON() : payrollData.user;
        console.log(`[Payslip] User data:`, {
            name: userData.name,
            email: userData.email,
            staffId: userData.staffId,
            role: userData.role
        });

        // 2. Generate HTML with serialized user data
        const htmlPayrollData = {
            ...payrollData,
            user: userData
        };
        const html = await generateHtml(htmlPayrollData);

        // 3. Generate PDF
        console.log(`[Payslip] Generating PDF...`);
        const pdfBuffer = await generatePdf(html);

        // 4. Save to DB (Snapshot)
        const filename = `Payslip-${userData.staffId}-${month}-${year}.pdf`;
        const filePath = path.join(__dirname, '../uploads', filename);
        fs.writeFileSync(filePath, pdfBuffer);
        console.log(`[Payslip] PDF saved to: ${filePath}`);

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
        console.log(`[Payslip] Sending email to: ${userData.email}`);
        const emailResult = await transporter.sendMail({
            from: `"WERK Payroll" <${process.env.SMTP_USER}>`,
            to: userData.email,
            subject: `Payslip for Period ${payrollData.period.start} - ${payrollData.period.end}`,
            html: `
                <h3>Dear ${userData.name},</h3>
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

        console.log(`[Payslip] Email sent successfully! Message ID: ${emailResult.messageId}`);
        return payslip;
    } catch (error) {
        console.error(`[Payslip] Error in sendPayslip:`, error);
        throw error;
    }
};

module.exports = {
    calculatePayroll,
    generateHtml,
    generatePdf,
    sendPayslip
};

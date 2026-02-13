const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const { Op } = require('sequelize');
const { format } = require('date-fns');

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
            subject: `Your Payslip for ${format(new Date(payrollData.period.start), 'MMMM yyyy')}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
                        .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
                        .content p { margin: 15px 0; color: #4b5563; }
                        .period-box { background: #f9fafb; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
                        .period-box strong { color: #111827; }
                        .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
                        .footer p { margin: 5px 0; font-size: 12px; color: #6b7280; }
                        .attachment-note { background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 6px; margin: 20px 0; }
                        .attachment-note p { margin: 0; color: #1e40af; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🧾 Monthly Payslip</h1>
                        </div>
                        <div class="content">
                            <p>Dear <strong>${userData.name}</strong>,</p>
                            
                            <p>We hope this email finds you well. Please find attached your official payslip document for the following period:</p>
                            
                            <div class="period-box">
                                <strong>Pay Period:</strong> ${format(new Date(payrollData.period.start), 'dd MMMM yyyy')} - ${format(new Date(payrollData.period.end), 'dd MMMM yyyy')}
                            </div>
                            
                            <div class="attachment-note">
                                <p>📎 Your detailed payslip is attached to this email as a PDF document.</p>
                            </div>
                            
                            <p>Please review the attached document carefully. If you have any questions or notice any discrepancies, please don't hesitate to contact the Finance Team.</p>
                            
                            <p style="margin-top: 30px;">Thank you for your continued dedication and hard work.</p>
                        </div>
                        <div class="footer">
                            <p><strong>WERK Finance Team</strong></p>
                            <p>PT. IDE SOLUSI INTEGRASI</p>
                            <p style="margin-top: 15px; font-size: 11px; color: #9ca3af;">This is an automated email. Please do not reply to this message.</p>
                        </div>
                    </div>
                </body>
                </html>
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

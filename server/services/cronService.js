const cron = require('node-cron');
const { Op } = require('sequelize');

const sendMorningBrief = async (models, transporter) => {
    const { User, Overtime, Claim, Leave, Quest, Setting } = models;
    console.log('[Cron] Running Daily Morning Brief...');

    try {
        const enabled = await Setting.findByPk('daily_email');
        if (enabled && enabled.value === false) {
            console.log('[Cron] Daily Morning Brief is disabled by settings. Skipping.');
            return { success: false, message: 'Disabled by settings' };
        }

        const overtimeCount = await Overtime.count({ where: { status: 'Pending' } });
        const claimCount = await Claim.count({ where: { status: 'Pending' } });
        const leaveCount = await Leave.count({ where: { status: 'Pending' } });

        const totalPending = overtimeCount + claimCount + leaveCount;

        const admins = await User.findAll({
            where: {
                role: { [Op.in]: ['admin', 'super_admin'] }
            }
        });

        if (admins.length === 0) {
            console.log('[Cron] No admins found to send email to.');
            return { success: false, message: 'No admins found' };
        }

        const frontendUrl = process.env.FRONTEND_URL || 'https://werk.kaumtech.com';

        let greeting = "Rise and shine, Boss! ☀️";
        let message = "While you were sleeping, the squad was grinding. Here is the backlog waiting for your judgment:";
        let ctaText = "⚡ SLAY THE QUEUE";
        let ctaLink = `${frontendUrl}/admin`;

        if (totalPending === 0) {
            greeting = "You're all caught up! ✨";
            message = "The dashboard is clean. Enjoy your morning coffee with peace of mind.";
            ctaText = "☕ VIEW DASHBOARD";
            ctaLink = `${frontendUrl}/admin`;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #18181b; color: #ffffff; }
                    .container { max-width: 600px; margin: 0 auto; background-color: #18181b; }
                    .header { padding: 40px 20px; text-align: center; border-bottom: 1px solid #27272a; }
                    .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; color: #ffffff; style: text-decoration: none; color: white }
                    .logo sup { color: #a3e635; font-size: 10px; margin-left: 2px; }
                    .content { padding: 40px 20px; text-align: center; }
                    .greeting { font-size: 24px; font-weight: 800; margin-bottom: 16px; color: #ffffff; }
                    .text { color: #a1a1aa; line-height: 1.6; margin-bottom: 32px; font-size: 16px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 40px; }
                    .stat-card { background-color: #27272a; padding: 20px 10px; border-radius: 12px; text-align: center; border: 1px solid #3f3f46; }
                    .stat-value { display: block; font-size: 24px; font-weight: 900; color: #ffffff; margin-bottom: 4px; }
                    .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #71717a; font-weight: 700; }
                    .cta-button { display: inline-block; background-color: #a3e635; color: #000000; font-weight: 800; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; transition: background-color 0.2s; }
                    .footer { text-align: center; padding: 40px 20px; color: #52525b; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <span class="logo">WERK<sup>IDE</sup></span>
                    </div>
                    <div class="content">
                        <h1 class="greeting">${greeting}</h1>
                        <p class="text">${message}</p>
                        
                        <div class="stats-grid">
                            <div class="stat-card">
                                <span class="stat-value">🕒 ${overtimeCount}</span>
                                <span class="stat-label">Overtimes</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-value">🧾 ${claimCount}</span>
                                <span class="stat-label">Claims</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-value">🌴 ${leaveCount}</span>
                                <span class="stat-label">Leaves</span>
                            </div>
                        </div>

                        <a href="${ctaLink}" class="cta-button">${ctaText}</a>
                    </div>
                    <div class="footer">
                        <p>Automated by WERK IDE Bot. Don't reply, I'm just a script.</p>
                        <p>WERK IDE Command Center • Jakarta, ID</p>
                    </div>
                </div>
            </body>
            </html>
            `;

        for (const admin of admins) {
            await transporter.sendMail({
                from: `"WERK IDE Bot" <${process.env.SMTP_USER}>`,
                to: admin.email,
                subject: totalPending > 0 ? `☕ Morning! ${totalPending} requests need your judgment.` : `☕ Morning! All caught up.`,
                html: htmlContent
            });
            console.log(`[Cron] Morning Brief sent to ${admin.email}`);
        }
        return { success: true, message: `Sent to ${admins.length} admins` };

    } catch (error) {
        console.error('[Cron] Failed to execute morning brief:', error);
        return { success: false, message: error.message };
    }
};

const sendPaydayAlert = async (models, transporter) => {
    const { User, Overtime, Claim, Quest, Setting } = models;
    console.log('[Cron] Running Monthly Payday Alert...');

    try {
        const enabled = await Setting.findByPk('monthly_email');
        if (enabled && enabled.value === false) {
            console.log('[Cron] Monthly Payday Alert is disabled by settings. Skipping.');
            return { success: false, message: 'Disabled by settings' };
        }

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        const startDate = new Date(year, month - 1, 28);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(year, month, 27);
        endDate.setHours(23, 59, 59, 999);

        const timestampFilter = { [Op.between]: [startDate, endDate] };

        console.log(`[Cron] Payday Window: ${startDate.toISOString()} - ${endDate.toISOString()}`);

        const approvedOvertimes = await Overtime.findAll({ where: { status: 'Approved', createdAt: timestampFilter } });
        const approvedClaims = await Claim.findAll({ where: { status: 'Approved', createdAt: timestampFilter } });
        const completedQuests = await Quest.findAll({ where: { status: 'Completed', createdAt: timestampFilter } });

        const otTotal = approvedOvertimes.reduce((sum, o) => sum + (o.payableAmount || 0), 0);
        const claimTotal = approvedClaims.reduce((sum, c) => sum + (c.amount || 0), 0);
        const questTotal = completedQuests.reduce((sum, q) => {
            const val = parseInt(q.reward.replace(/\D/g, ''));
            return sum + (isNaN(val) ? 0 : val);
        }, 0);

        const totalBill = otTotal + claimTotal + questTotal;

        if (totalBill === 0) {
            console.log('[Cron] Total bill is 0. Skipping Payday Alert.');
            return { success: false, message: 'Total bill is 0' };
        }

        const admins = await User.findAll({
            where: { role: { [Op.in]: ['admin', 'super_admin'] } }
        });

        const frontendUrl = process.env.FRONTEND_URL || 'https://werk.kaumtech.com';
        const formattedTotal = totalBill.toLocaleString('id-ID');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #18181b; color: #ffffff; }
                    .container { max-width: 600px; margin: 0 auto; background-color: #18181b; }
                    .header { padding: 40px 20px; text-align: center; border-bottom: 1px solid #27272a; }
                    .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; color: #ffffff; text-decoration: none; }
                    .logo sup { color: #a3e635; font-size: 10px; margin-left: 2px; }
                    .content { padding: 40px 20px; text-align: center; }
                    .amount { font-size: 48px; font-weight: 900; color: #a3e635; margin: 20px 0; text-shadow: 0 0 20px rgba(163, 230, 53, 0.3); }
                    .text { color: #a1a1aa; line-height: 1.6; margin-bottom: 32px; font-size: 16px; }
                    .details-box { background: #27272a; padding: 20px; border-radius: 12px; margin-bottom: 30px; text-align: left; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
                    .row.total { border-top: 1px solid #3f3f46; padding-top: 10px; margin-top: 10px; font-weight: 800; font-size: 16px; color: white; }
                    .footer { text-align: center; padding: 40px 20px; color: #52525b; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                         <span class="logo">WERK<sup>IDE</sup></span>
                    </div>
                    <div class="content">
                        <h1>💸 PAYDAY ALERT!</h1>
                        <p class="text">The invoice for this month is ready. Time to secure the bag.</p>
                        
                        <div class="amount">Rp ${formattedTotal}</div>

                        <div class="details-box">
                            <div class="row"><span>Overtimes</span> <span style="color: #fff">Rp ${otTotal.toLocaleString('id-ID')}</span></div>
                            <div class="row"><span>Claims</span> <span style="color: #fff">Rp ${claimTotal.toLocaleString('id-ID')}</span></div>
                            <div class="row"><span>Bounties</span> <span style="color: #fff">Rp ${questTotal.toLocaleString('id-ID')}</span></div>
                            <div class="row total"><span>TOTAL DUE</span> <span>Rp ${formattedTotal}</span></div>
                        </div>

                        <a href="${frontendUrl}/admin" style="background:#a3e635; color:black; padding:15px 30px; text-decoration:none; font-weight:800; border-radius:10px;">VIEW PAYROLL</a>
                    </div>
                    <div class="footer">
                        <p>Automated by WERK IDE Bot.</p>
                    </div>
                </div>
            </body>
            </html>
            `;

        for (const admin of admins) {
            await transporter.sendMail({
                from: `"WERK IDE Bot" <${process.env.SMTP_USER}>`,
                to: admin.email,
                subject: `💸 PAYDAY ALERT! Total bill: Rp ${formattedTotal}`,
                html: htmlContent
            });
            console.log(`[Cron] Payday Alert sent to ${admin.email}`);
        }
        return { success: true, message: `Sent to ${admins.length} admins` };
    } catch (error) {
        console.error('[Cron] Failed to run Payday Alert:', error);
        return { success: false, message: error.message };
    }
};

const initCronJobs = (models, transporter) => {
    // 1. DAILY MORNING BRIEF (08:00 AM)
    cron.schedule('0 8 * * *', () => sendMorningBrief(models, transporter), {
        scheduled: true,
        timezone: "Asia/Jakarta"
    });

    // 2. MONTHLY PAYDAY INVOICE (28th at 09:00 AM)
    cron.schedule('0 9 28 * *', () => sendPaydayAlert(models, transporter), {
        scheduled: true,
        timezone: "Asia/Jakarta"
    });
};

module.exports = { initCronJobs, sendMorningBrief, sendPaydayAlert };

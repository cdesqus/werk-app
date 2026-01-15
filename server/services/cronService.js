const cron = require('node-cron');
const { Op } = require('sequelize');

const sendMorningBrief = async (models, transporter) => {
    const { User, Overtime, Claim, Leave, Setting } = models;
    console.log('[Cron] Running Daily Morning Brief...');

    try {
        const enabled = await Setting.findByPk('daily_email');
        if (enabled && enabled.value === false) {
            console.log('[Cron] Daily Morning Brief is disabled by settings. Skipping.');
            return { success: false, message: 'Disabled by settings' };
        }

        // Fetch detailed pending items (limit 3 each to keep email concise)
        const pendingOvertimes = await Overtime.findAll({
            where: { status: 'Pending' },
            limit: 3,
            include: [{ model: User, attributes: ['name', 'email'] }],
            order: [['date', 'DESC']]
        });

        const pendingClaims = await Claim.findAll({
            where: { status: 'Pending' },
            limit: 3,
            include: [{ model: User, attributes: ['name', 'email'] }],
            order: [['date', 'DESC']]
        });

        const pendingLeaves = await Leave.findAll({
            where: { status: 'Pending' },
            limit: 3,
            include: [{ model: User, attributes: ['name', 'email'] }],
            order: [['startDate', 'DESC']]
        });

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

        // --- HTML GENERATION HELPERS ---
        const generateItemRow = (title, subtitle, meta, icon) => `
            <div class="item-row">
                <div class="item-icon">${icon}</div>
                <div class="item-content">
                    <div class="item-title">${title}</div>
                    <div class="item-subtitle">${subtitle}</div>
                </div>
                <div class="item-meta">${meta}</div>
            </div>
        `;

        let itemsHtml = '';

        if (pendingOvertimes.length > 0) {
            itemsHtml += `<div class="section-title">PENDING OVERTIMES (${overtimeCount})</div>`;
            pendingOvertimes.forEach(ot => {
                itemsHtml += generateItemRow(
                    ot.User ? ot.User.name : 'Unknown User',
                    ot.activity || 'Overtime Request',
                    `${ot.hours} Hours • ${ot.date}`,
                    '🕒'
                );
            });
        }

        if (pendingClaims.length > 0) {
            itemsHtml += `<div class="section-title" style="margin-top: 20px;">PENDING CLAIMS (${claimCount})</div>`;
            pendingClaims.forEach(claim => {
                itemsHtml += generateItemRow(
                    claim.User ? claim.User.name : 'Unknown User',
                    claim.title,
                    `Rp ${claim.amount.toLocaleString('id-ID')}`,
                    '🧾'
                );
            });
        }

        if (pendingLeaves.length > 0) {
            itemsHtml += `<div class="section-title" style="margin-top: 20px;">PENDING LEAVES (${leaveCount})</div>`;
            pendingLeaves.forEach(leave => {
                itemsHtml += generateItemRow(
                    leave.User ? leave.User.name : 'Unknown User',
                    `${leave.type} Leave`,
                    `${leave.days} Days • ${leave.startDate}`,
                    '🌴'
                );
            });
        }

        let greeting = "Rise and shine, Boss! ☀️";
        let message = "The squad has been busy. Here are the latest requests waiting for your approval.";
        let ctaText = "Review All Requests";
        let ctaLink = `${frontendUrl}/admin`;

        if (totalPending === 0) {
            greeting = "You're all caught up! ✨";
            message = "The dashboard is spotless. Enjoy your morning coffee with peace of mind.";
            ctaText = "Go to Dashboard";
            itemsHtml = `
                <div style="text-align: center; padding: 40px 20px; color: #a1a1aa;">
                    <div style="font-size: 48px; margin-bottom: 10px;">☕</div>
                    <div>No pending items. Have a great day!</div>
                </div>
            `;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b; }
                    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                    .header { padding: 32px 40px; text-align: center; border-bottom: 1px solid #f4f4f5; background-color: #ffffff; }
                    .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; color: #18181b; text-decoration: none; }
                    .logo sup { color: #65a30d; font-size: 10px; margin-left: 2px; }
                    .content { padding: 40px; }
                    .greeting { font-size: 28px; font-weight: 800; margin: 0 0 12px 0; color: #18181b; letter-spacing: -0.5px; text-align: center; }
                    .text { color: #52525b; line-height: 1.6; margin-bottom: 32px; font-size: 16px; text-align: center; }
                    
                    .section-title { font-size: 11px; font-weight: 700; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
                    
                    .item-row { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f4f4f5; }
                    .item-row:last-child { border-bottom: none; }
                    .item-icon { width: 36px; height: 36px; background-color: #f4f4f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; margin-right: 16px; flex-shrink: 0; }
                    .item-content { flex: 1; }
                    .item-title { font-size: 14px; font-weight: 700; color: #18181b; margin-bottom: 2px; }
                    .item-subtitle { font-size: 13px; color: #52525b; }
                    .item-meta { font-size: 12px; font-weight: 600; color: #71717a; text-align: right; white-space: nowrap; margin-left: 12px; background: #f4f4f5; padding: 4px 8px; border-radius: 6px; }

                    .cta-container { text-align: center; margin-top: 40px; }
                    .cta-button { display: inline-block; background-color: #18181b; color: #ffffff; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 14px; transition: opacity 0.2s; }
                    .cta-button:hover { opacity: 0.9; }
                    
                    .footer { text-align: center; padding: 32px; background-color: #fafafa; color: #a1a1aa; font-size: 12px; border-top: 1px solid #f4f4f5; }
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
                        
                        <div style="background: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 24px;">
                            ${itemsHtml}
                        </div>

                        <div class="cta-container">
                            <a href="${ctaLink}" class="cta-button">${ctaText}</a>
                        </div>
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

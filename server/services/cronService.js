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

const sendBirthdayAlert = async (models, transporter) => {
    const { User, Setting } = models;
    console.log('[Cron] Running Birthday Alert...');

    try {
        const enabled = await Setting.findByPk('birthday_email');
        if (enabled && enabled.value === false) {
            console.log('[Cron] Birthday Alert is disabled by settings. Skipping.');
            return { success: false, message: 'Disabled by settings' };
        }

        const today = new Date();
        const currentMonth = today.getMonth() + 1; // JS months are 0-11
        const currentDay = today.getDate();

        // Find users with birthday today
        // Sequelize SQLite specific syntax for date extraction might vary, but for compatibility we can fetch all or use raw query.
        // Or simpler: fetch all users and filter in JS if user base is small (<1000). Werk has small user base.
        const allUsers = await User.findAll({ attributes: ['id', 'name', 'email', 'birthDate', 'role'] });

        const birthdayPeeps = allUsers.filter(u => {
            if (!u.birthDate) return false;
            const d = new Date(u.birthDate);
            return d.getDate() === currentDay && (d.getMonth() + 1) === currentMonth;
        });

        if (birthdayPeeps.length === 0) {
            console.log('[Cron] No birthdays today.');
            return { success: true, message: 'No birthdays today' };
        }

        // Recipients: All users
        const recipients = allUsers.map(u => u.email);
        const frontendUrl = process.env.FRONTEND_URL || 'https://werk.kaumtech.com';

        for (const bdayUser of birthdayPeeps) {
            const firstName = bdayUser.name.split(' ')[0];

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #fafafa; color: #18181b; }
                        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #f4f4f5; }
                        .header { background: radial-gradient(circle at center, #fef08a, #fde047); padding: 40px 20px; text-align: center; }
                        .cake-icon { font-size: 64px; margin-bottom: 10px; display: block; animation: bounce 2s infinite; }
                        .title { font-size: 32px; font-weight: 900; color: #854d0e; margin: 0; letter-spacing: -1px; }
                        .subtitle { font-size: 16px; color: #a16207; font-weight: 600; margin-top: 8px; text-transform: uppercase; letter-spacing: 2px; }
                        .content { padding: 40px 30px; text-align: center; }
                        .avatar { width: 120px; height: 120px; border-radius: 60px; background-color: #f4f4f5; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; font-size: 48px; border: 4px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); color: #71717a; font-weight: 900; }
                        .message { font-size: 18px; line-height: 1.6; color: #52525b; margin-bottom: 32px; }
                        .wish-button { background-color: #18181b; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; transition: transform 0.2s; display: inline-block; }
                        .wish-button:hover { transform: translateY(-2px); }
                        .footer { padding: 30px; background-color: #18181b; color: #52525b; font-size: 12px; text-align: center; border-top: 1px solid #27272a; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <span class="cake-icon">🎂</span>
                            <h1 class="title">Happy Birthday!</h1>
                        </div>
                        <div class="content">
                            <div class="avatar">
                                ${bdayUser.name.charAt(0)}
                            </div>
                            <h2 style="font-size: 24px; font-weight: 800; margin: 0 0 10px 0; color: #18181b;">${bdayUser.name}</h2>
                            <p style="color: #a1a1aa; font-weight: 600; font-size: 14px; margin: 0 0 24px 0;">${bdayUser.role.toUpperCase().replace('_', ' ')}</p>
                            
                            <p class="message">
                                Today is a special day! Let's all wish <strong>${firstName}</strong> a fantastic birthday. 
                                May your year be filled with bug-free code, approved leaves, and endless coffee. 🎉
                            </p>

                            <a href="${frontendUrl}" class="wish-button">Send Good Vibes</a>
                        </div>
                        <div class="footer">
                            <p style="color: #71717a;">WERK IDE Celebration Bot</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            // Send to ALL users
            // Using BCC to send one email to everyone, or individual loop if safer.
            // For better deliverability and personalization, individual is better, but risky for quota.
            // Using BCC for efficiency here as requested "email to all".

            await transporter.sendMail({
                from: `"WERK Celebration" <${process.env.SMTP_USER}>`,
                bcc: recipients,
                subject: `🎂 Happy Birthday ${bdayUser.name}!`,
                html: htmlContent
            });

            console.log(`[Cron] Birthday email for ${bdayUser.name} sent to ${recipients.length} users.`);
        }

        return { success: true, message: `Celebrated ${birthdayPeeps.length} birthdays` };

    } catch (error) {
        console.error('[Cron] Failed to run Birthday Alert:', error);
        return { success: false, message: error.message };
    }
};

const sendMonthlyPayslips = async (models, transporter) => {
    const { User } = models;
    const { sendPayslip } = require('./payslipService');

    console.log('[Cron] Running Monthly Payslip Distribution...');

    try {
        // Since it runs on the 1st of the new month, calculate for the previous month
        let month = today.getMonth(); // 0 is January, etc. So if March (2), previous month is February (2 is 1-indexed Feb)
        let year = today.getFullYear();

        if (month === 0) { // If January 1st
            month = 12; // December
            year -= 1;  // Previous year
        }

        console.log(`[Cron] Generating payslips for period: ${month}/${year}`);

        // Get all users except superadmins
        const users = await User.findAll({
            where: {
                role: { [Op.ne]: 'superadmin' }
            },
            order: [['name', 'ASC']]
        });

        if (users.length === 0) {
            console.log('[Cron] No users found to send payslips to.');
            return { success: false, message: 'No users found' };
        }

        console.log(`[Cron] Found ${users.length} users. Starting payslip generation...`);

        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (const user of users) {
            try {
                console.log(`[Cron] Processing payslip for ${user.name} (${user.email})...`);

                // Send payslip with no manual adjustments
                await sendPayslip(models, transporter, user.id, month, year, []);

                successCount++;
                console.log(`[Cron] ✓ Payslip sent to ${user.name}`);
            } catch (error) {
                failCount++;
                const errorMsg = `Failed for ${user.name}: ${error.message}`;
                errors.push(errorMsg);
                console.error(`[Cron] ✗ ${errorMsg}`);
            }
        }

        const summary = `Payslip Distribution Complete: ${successCount} sent, ${failCount} failed`;
        console.log(`[Cron] ${summary}`);

        if (errors.length > 0) {
            console.error('[Cron] Errors:', errors);
        }

        return {
            success: true,
            message: summary,
            details: { successCount, failCount, errors }
        };

    } catch (error) {
        console.error('[Cron] Failed to run Monthly Payslip Distribution:', error);
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

    // 3. BIRTHDAY ALERT (08:05 AM)
    cron.schedule('5 8 * * *', () => sendBirthdayAlert(models, transporter), {
        scheduled: true,
        timezone: "Asia/Jakarta"
    });

    // 4. MONTHLY PAYSLIP DISTRIBUTION (1st at 09:00 AM)
    cron.schedule('0 9 1 * *', () => sendMonthlyPayslips(models, transporter), {
        scheduled: true,
        timezone: "Asia/Jakarta"
    });

    console.log('[Cron] All cron jobs initialized:');
    console.log('  - Daily Morning Brief: 08:00 AM');
    console.log('  - Monthly Payday Alert: 28th at 09:00 AM');
    console.log('  - Birthday Alert: 08:05 AM');
    console.log('  - Monthly Payslip Distribution: 1st at 09:00 AM');
};

module.exports = { initCronJobs, sendMorningBrief, sendPaydayAlert, sendBirthdayAlert, sendMonthlyPayslips };

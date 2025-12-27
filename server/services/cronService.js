const cron = require('node-cron');
const { Op } = require('sequelize');

const startDailyBrief = (models, transporter) => {
    const { User, Overtime, Claim, Leave } = models;

    // Schedule: 08:00 AM every day
    cron.schedule('0 8 * * *', async () => {
        console.log('[Cron] Running Daily Morning Brief...');

        try {
            // 1. Aggregation
            const overtimeCount = await Overtime.count({ where: { status: 'Pending' } });
            const claimCount = await Claim.count({ where: { status: 'Pending' } });
            const leaveCount = await Leave.count({ where: { status: 'Pending' } });

            const totalPending = overtimeCount + claimCount + leaveCount;

            if (totalPending === 0) {
                console.log('[Cron] No pending items. Skipping email.');
                return;
            }

            // 2. Recipients
            const admins = await User.findAll({
                where: {
                    role: { [Op.in]: ['admin', 'super_admin'] }
                }
            });

            if (admins.length === 0) {
                console.log('[Cron] No admins found to send email to.');
                return;
            }

            // 3. Email Template
            const frontendUrl = process.env.FRONTEND_URL || 'https://werk.kaumtech.com';
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
                        <a href="${frontendUrl}" class="logo">WERK<sup>IDE</sup></a>
                    </div>
                    <div class="content">
                        <h1 class="greeting">Rise and shine, Boss! ☀️</h1>
                        <p class="text">
                            While you were sleeping, the squad was grinding. 
                            Here is the backlog waiting for your judgment:
                        </p>
                        
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

                        <a href="${frontendUrl}/admin" class="cta-button">⚡ SLAY THE QUEUE</a>
                    </div>
                    <div class="footer">
                        <p>Automated by WERK IDE Bot. Don't reply, I'm just a script.</p>
                        <p>WERK IDE Command Center • Jakarta, ID</p>
                    </div>
                </div>
            </body>
            </html>
            `;

            // 4. Send Email
            for (const admin of admins) {
                await transporter.sendMail({
                    from: `"WERK IDE Bot" <${process.env.SMTP_USER}>`, // Or use settings logic if available, but env is safer fallbak
                    to: admin.email,
                    subject: `☕ Morning! ${totalPending} requests need your judgment.`,
                    html: htmlContent
                });
                console.log(`[Cron] Morning Brief sent to ${admin.email}`);
            }

        } catch (error) {
            console.error('[Cron] Failed to execute morning brief:', error);
        }
    });
};

module.exports = { startDailyBrief };

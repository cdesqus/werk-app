# WERK IDE - Application Documentation

## Overview
WERK IDE is a modern, Gen-Z styled internal tool for managing staff activities, including overtime logging, reimbursement claims, leave requests, and team engagement (Vibe Check). The application features a dual-role system (Admin & Staff) with robust security measures and comprehensive audit logging.

## 🚀 Features

### 1. Authentication & Security (Defense in Depth)
*   **Math CAPTCHA**: A rotating 20-second challenge to prevent bot attacks on login/register screens.
*   **Role-Based Access Control (RBAC)**: Strict separation between 'Staff', 'Admin', and 'Super Admin'.
*   **JWT Authentication**: Secure, expiration-based session management (24h).
*   **Rate Limiting**:
    *   *Login protection*: Limits failed attempts to prevent brute-force attacks.
    *   *API protection*: General rate limits on all endpoints to prevent DoS.
*   **File Sanitization**:
    *   Strict allow-list for file uploads (`.jpg`, `.jpeg`, `.png` only).
    *   Server-side image re-processing (via `sharp`) to strip malicious metadata.
*   **Audit Logging**: Detailed tracking of critical security events (Login, Password Change, Admin Actions).

### 2. Staff Features (The Hustle)
*   **Overtime Logging**: Log work hours with automatic duration calculation (Rp 40,000/hour flat rate).
*   **Reimbursement Claims**: Submit expenses with proof. File inputs strictly limit acceptance to image files.
*   **Leave Management**: Request Annual, Sick, or Unpaid leave. Real-time quota tracking.
*   **Side Quests**: View and accept extra tasks/bounties.
*   **Vibe Check**: Participate in anonymous/public polls.
*   **Security Profile**: Change password securely (requires current password verification).

### 3. Admin Features (The Boss)
*   **Daily Morning Brief**: Automated email at **08:00 AM** summarizing all pending tasks (Overtimes, Claims, Leaves) so you can start the day knowing exactly what needs attention.
*   **Dashboard Overview**: Quick stats on pending requests, payroll, and active users.
*   **User Management**:
    *   **Bento Grid Interface**: Modern UI for editing user profiles.
    *   **Security Zone**: Admins can reset staff passwords.
    *   **Danger Zone**: Permanent account deletion with confirmation.
*   **Payroll System**:
    *   **Drill-Down Details**: Expand staff rows to see exact breakdown of approved Overtimes and Claims.
    *   **Visibility Control**: Only "Approved" items appear in the payment view.
    *   **Bulk Processing**: "Mark as Paid" action updates status for all selected items.
    *   **Cycle Rules**: 
        *   The payroll cycle runs from the **28th of the previous month** to the **27th of the current month**.
        *   On the **28th at 09:00 AM**, an automated "PAYDAY ALERT" email is sent to all admins summarizing the total due.
*   **Audit Logs**:
    *   View chronological history of all security-critical events.
    *   Tracks: Timestamp, User, Action Type, Details, and Origin IP Address.
    *   **Auto-Retention**: Logs older than 7 days are automatically purged to save storage.

---

## 🔄 User Flows

### Login Flow
```mermaid
graph TD
    A[User Visits Login] --> B{Resolve CAPTCHA};
    B -- Incorrect --> A;
    B -- Correct --> C[Enter Credentials];
    C --> D{Validate Credentials};
    D -- Invalid --> C;
    D -- Valid --> E[Log Audit Event];
    E --> F{Check Force Change Password};
    F -- Yes --> G[Redirect /force-change-password];
    G --> H[Update Password];
    H --> I{Check Role};
    F -- No --> I;
    I -- Admin --> J[Redirect /admin];
    I -- Staff --> K[Redirect /staff];
```

1.  **Access**: User visits `/login`.
2.  **Verification**: Solves the math CAPTCHA.
3.  **Credentials**: Enters Email and Password.
4.  **Audit**: Successful login is logged to Audit Trail.
5.  **Security Check**:
    *   If **first-time login** (or reset), user is redirected to `/force-change-password`.
    *   User *must* change their temporary password to proceed.
6.  **Routing**: Redirects to appropriate dashboard based on Role.

### Security Audit Flow (Super Admin)
```mermaid
graph LR
    A[Page Load] --> B{Check Old Logs};
    B -- > 7 Days --> C[Auto Delete];
    B -- < 7 Days --> D[Keep Logs];
    C --> E[Fetch Recent Logs];
    D --> E;
    E --> F[Display UI];
    F --> G[Admin Reviews IPs/Actions];
```

1.  **Access**: Navigate to **System > Audit Logs**.
2.  **Review**:
    *   See who logged in, who created/deleted users, and who modified financial records.
    *   Check "IP Address" to verify location (Public Origin IP).
3.  **Search**: Filter logs by User Name or Action type (e.g., "Delete").
4.  **Cleanup**: System automatically deletes logs > 7 days old upon page load.

### Payroll Flow (Admin)
```mermaid
graph TD
    A[Select Month/Year] --> B[Fetch Payroll Summary];
    B --> C{Review Details};
    C -- Expand Row --> D[View Approved Overtimes/Claims];
    D --> E{Verify Amounts};
    E -- Error --> F[Contact Staff];
    E -- Correct --> G[Select Staff];
    G --> H[Click 'Mark as Paid'];
    H --> I[Update Status in DB];
    I --> J[Log Audit Event];
    J --> K[Re-fetch Updated Data];
    
    subgraph Periodic [Automated Cycle]
        L[28th of Month] --> M{Check 28th Prev - 27th Curr};
        M --> N[Send Payday Email to Admin];
    end
```

**Note**: The system automatically generates a comprehensive invoice email on the **28th of every month**, covering approved activities from the 28th of the prior month to the 27th of the current month.

1.  **View**: Navigate to **Finance > Payroll**.
2.  **Filter**: Select Month/Year.
3.  **Inspect**: Click the arrow (`v`) next to a staff member to expand details.
    *   *Verify*: Check that only valid, approved items are listed.
4.  **Process**: Select staff members and click **Mark as Paid**.
    *   *Audit*: This action is logged as "Admin Processed Payout".
5.  **Export**: Download Excel report for external banking processing.

---

## 🛠️ Technical Architecture

### Tech Stack
*   **Frontend**: React, Vite, TailwindCSS (Glassmorphism), Lucide Icons.
*   **Backend**: Node.js, Express, Sequelize (PostgreSQL) - Migrate from SQLite in Jan 2026.
*   **Database**: PostgreSQL 15 (Dockerized) - Chosen for reliability and complex date handling.
*   **Security Middleware**: `helmet` (headers), `express-rate-limit`, `express-validator`, `multer` (upload limits).

### Database Schema (Key Models)
*   **Users**: `id`, `name`, `email`, `password` (hashed), `role`, `leaveQuota`, `staffId`.
*   **AuditLog**: `id`, `UserId`, `action`, `details`, `ip`, `createdAt`.
*   **Overtimes**: `id`, `UserId`, `status` ('Pending', 'Approved', 'Paid', 'Rejected'), `payableAmount`.
*   **Claims**: `id`, `UserId`, `status`, `proof` (sanitized path).

---

## 🐳 Production Deployment (Docker)

The system now runs on a fully containerized environment with a dedicated database service.

1.  **Configuration**:
    *   Ensure `.env` contains a strong `SECRET_KEY` and SMTP credentials.
    *   Database connection is handled via `docker-compose` internal networking (`DB_HOST=db`).
2.  **Container Structure**:
    *   `client`: Nginx serving React App (Port 81).
    *   `server`: Node.js Express API (Port 5000).
    *   `db`: PostgreSQL 15 Database (Port 5432) with persistent volume `postgres_data`.
3.  **Build & Run**:
    ```bash
    docker-compose down  # Stop old containers
    docker-compose up -d --build # Build and start new stack
    ```
4.  **Access**:
    *   Frontend: `http://localhost` (or configured domain)
    *   API: `http://localhost/api`
    *   Uploads: `http://localhost/uploads` (Served securely via Nginx).

## 💰 Payroll Logic (Critical)
The system enforces a strict **Monthly Cutoff Cycle**:
- **Start Date**: 28th of the *Previous* Month.
- **End Date**: 27th of the *Current* Month.
- **Example**: For the **January 2026** payroll, the system aggregates approved tasks from **Dec 28, 2025** to **Jan 27, 2026**.
- **Reasoning**: This provides a 3-4 day buffer for admin processing before the actual end-of-month payday, ensuring payments can be made strictly on the 1st or last day of the month without rushing.

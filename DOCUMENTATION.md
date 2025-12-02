# WERK IDE - Application Documentation

## Overview
WERK IDE is a modern, Gen-Z styled internal tool for managing staff activities, including overtime logging, reimbursement claims, leave requests, and team engagement (Vibe Check). The application features a dual-role system (Admin & Staff) with a secure, math-captcha protected login.

## 🚀 Features

### 1. Authentication & Security
*   **Math CAPTCHA**: A rotating 20-second challenge to prevent bot attacks on the login screen.
*   **Role-Based Access Control (RBAC)**: Distinct dashboards and permissions for 'Admin' and 'Staff'.
*   **JWT Authentication**: Secure session management.

### 2. Staff Features (The Hustle)
*   **Overtime Logging**: Log work hours with automatic duration calculation.
    *   *Flat Rate*: Fixed at Rp 40,000/hour.
    *   *Holiday Detection*: Alerts if the selected date is a weekend or National Holiday.
*   **Reimbursement Claims**: Submit expenses with categories (Transport, Medical, Food, Subscription, Other) and proof of payment (image upload).
*   **Leave Management**: Request Annual, Sick, or Unpaid leave. Real-time quota tracking (Default: 12 days).
*   **Side Quests**: View and accept extra tasks/bounties posted by Admins.
*   **Vibe Check**: Participate in polls and view company announcements.

### 3. Admin Features (The Boss)
*   **Dashboard Overview**: Quick stats on pending requests, total payroll, and active users.
*   **Request Management**: Approve or Reject Overtime, Claims, and Leave requests.
*   **Payroll System**:
    *   View monthly summaries of approved Overtime and Claims per user.
    *   Export data to Excel.
    *   "Mark as Paid" functionality for processed payments.
*   **User Management**: Create and manage staff accounts (Auto-generated Staff IDs: `IDE-YYYY-XXXX`).
*   **Content Management**: Create Quests, Polls, and Announcements.

---

## 🔄 User Flows

### Login Flow
1.  **Access**: User visits the login page.
2.  **Verification**: Solves the math CAPTCHA (refreshes every 20s).
3.  **Credentials**: Enters Email and Password.
4.  **Routing**:
    *   `Admin` -> Redirected to `/admin` (Admin Dashboard).
    *   `Staff` -> Redirected to `/staff` (Staff Dashboard).

### Overtime Flow (Staff)
1.  **Initiate**: Click "New Hustle" in the Overtime tab.
2.  **Input**: Select Date, Start Time, End Time, Activity, and Customer.
3.  **Submit**: System calculates hours and payable amount. Status set to `Pending`.
4.  **Review**: Admin reviews the request.
    *   *Approve*: Added to payroll calculation.
    *   *Reject*: Marked as rejected.

### Claim Flow (Staff)
1.  **Initiate**: Click "New Claim".
2.  **Input**: Upload Proof, enter Amount, Title, and Category.
3.  **Submit**: Status set to `Pending`.
4.  **Review**: Admin checks proof and details.
    *   *Approve*: Added to payroll.
    *   *Reject*: User notified.

### Payroll Flow (Admin)
1.  **View**: Navigate to Payroll page.
2.  **Filter**: Select Month/Year.
3.  **Process**: Check "Total Payable" for each user.
4.  **Action**:
    *   *Export*: Download Excel report for finance.
    *   *Pay*: Click "Mark as Paid" to update status of all approved items for that period.

---

## 🛠️ Technical Architecture

### Tech Stack
*   **Frontend**: React, Vite, TailwindCSS (Glassmorphism UI).
*   **Backend**: Node.js, Express.
*   **Database**: SQLite (Sequelize ORM).
*   **Containerization**: Docker, Docker Compose.

### Database Schema
*   **Users**: `id`, `name`, `email`, `password`, `role`, `leaveQuota`, `staffId`.
*   **Overtimes**: `id`, `UserId`, `date`, `hours`, `payableAmount`, `status`.
*   **Claims**: `id`, `UserId`, `amount`, `proof`, `status`, `category`.
*   **Leaves**: `id`, `UserId`, `startDate`, `endDate`, `days`, `status`.
*   **Feeds/Polls**: `id`, `type`, `title`, `content`, `options` (relational).
*   **Quests**: `id`, `title`, `reward`, `status`, `assignedTo`.

---

## 🐳 Production Deployment (Docker)

To deploy the application in a production environment:

1.  **Prerequisites**: Ensure Docker and Docker Compose are installed.
2.  **Configuration**:
    *   Update the `.env` file in `server/` with your production secrets (SMTP, Secret Keys).
    *   **Secret Key**: This is used to sign session tokens. You can generate a secure one by running this command in your terminal:
        ```bash
        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
        ```
        Copy the output and paste it as `SECRET_KEY` in your `.env` file or `docker-compose.yml`.
3.  **Build & Run**:
    ```bash
    docker-compose up -d --build
    ```
4.  **Access**:
    *   Frontend: `http://localhost:81` (or your domain).
    *   API: `http://localhost/api` (proxied internally).

### Directory Structure
```
werk-app/
├── client/                 # React Frontend
│   ├── Dockerfile
│   ├── nginx.conf
│   └── ...
├── server/                 # Node.js Backend
│   ├── Dockerfile
│   ├── database.sqlite     # Persisted via volume
│   ├── uploads/            # Persisted via volume
│   └── ...
├── docker-compose.yml
└── DOCUMENTATION.md
```

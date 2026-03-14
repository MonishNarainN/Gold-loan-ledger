# GoldFlow Backend

A comprehensive backend API for the Gold Loan Management System built with Node.js, Express, and MongoDB.

## Features

- **User Management**: Registration, authentication, approval system
- **Loan Management**: Full CRUD operations for gold loans
- **Transaction Management**: Payment tracking and history
- **Admin Dashboard**: User approval, loan management, analytics
- **Notification System**: Real-time notifications for users
- **Renewal Requests**: Loan renewal functionality
- **System Settings**: Configurable business parameters

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/goldflow
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   FRONTEND_URL=http://localhost:5173
   ADMIN_EMAIL=admin@goldflow.com
   ADMIN_PASSWORD=admin123
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system:
   ```bash
   mongod
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/pending-users` - Get pending users (Admin)
- `PUT /api/auth/approve-user/:id` - Approve/reject user (Admin)

### Users
- `GET /api/users` - Get all users (Admin)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user (Admin)
- `GET /api/users/:id/stats` - Get user statistics

### Loans
- `GET /api/loans` - Get all loans
- `GET /api/loans/user/:userId` - Get user loans
- `GET /api/loans/:id` - Get loan by ID
- `POST /api/loans` - Create new loan
- `PUT /api/loans/:id` - Update loan (Admin)
- `DELETE /api/loans/:id` - Delete loan (Admin)
- `PUT /api/loans/:id/status` - Update loan status (Admin)
- `PUT /api/loans/check-overdue` - Check overdue loans (Admin)

### Transactions
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/loan/:loanId` - Get loan transactions
- `GET /api/transactions/user/:userId` - Get user transactions
- `GET /api/transactions/:id` - Get transaction by ID
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id/status` - Update transaction status (Admin)

### Admin
- `GET /api/admin/dashboard` - Get dashboard data
- `GET /api/admin/customers` - Get all customers
- `GET /api/admin/loans` - Get loans with filters
- `GET /api/admin/settings` - Get system settings
- `PUT /api/admin/settings` - Update system settings
- `GET /api/admin/renewals` - Get renewal requests
- `PUT /api/admin/renewals/:id/status` - Update renewal status
- `GET /api/admin/statistics` - Get system statistics

### Renewals
- `GET /api/renewals` - Get all renewal requests
- `GET /api/renewals/user/:userId` - Get user renewal requests
- `GET /api/renewals/:id` - Get renewal request by ID
- `POST /api/renewals` - Create renewal request
- `PUT /api/renewals/:id/status` - Update renewal status (Admin)

### Notifications
- `GET /api/notifications/user/:userId` - Get user notifications
- `GET /api/notifications/user/:userId/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/user/:userId/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications` - Create notification (Admin)

## Data Models

### User
- Personal information (name, email, phone, address)
- Authentication (password, role, approval status)
- KYC details (Aadhar, PAN)

### Loan
- Loan details (amount, interest rate, term)
- Gold information (weight, purity, rate, value)
- Status tracking (pending, active, overdue, completed)
- Approval workflow

### Transaction
- Payment tracking (amount, type, method)
- Status management (pending, completed, failed)
- Reference and description

### RenewalRequest
- Extension requests for active loans
- Approval workflow
- Financial calculations

### Notification
- User notifications
- System alerts
- Read status tracking

### SystemSettings
- Business configuration
- Interest rates and fees
- Company information

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Rate limiting
- CORS protection
- Input validation
- Helmet security headers

## Error Handling

- Centralized error handling
- Validation error responses
- Database error handling
- JWT error handling
- Custom error responses

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests

### Environment Variables
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRE` - JWT expiration time
- `FRONTEND_URL` - Frontend URL for CORS
- `ADMIN_EMAIL` - Admin user email
- `ADMIN_PASSWORD` - Admin user password

## Default Admin Credentials

- **Email**: admin@goldflow.com
- **Password**: admin123

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

## License

MIT License

const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');

const initializeAdmin = async () => {
  try {
    // Check if admin user exists
    const adminExists = await User.findOne({ role: 'ADMIN' });
    
    if (!adminExists) {
      console.log('🔧 Creating admin user...');
      
      const admin = await User.create({
        name: 'Admin User',
        email: process.env.ADMIN_EMAIL || 'admin@goldflow.com',
        phone: '9876543210',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        role: 'ADMIN',
        isActive: true,
        approvedAt: new Date(),
        address: 'Admin Office',
        city: 'Mumbai',
        pincode: '400001'
      });

      console.log('✅ Admin user created successfully');
      console.log(`📧 Email: ${admin.email}`);
      console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    } else {
      console.log('✅ Admin user already exists');
    }

    // Check if system settings exist
    const settingsExist = await SystemSettings.findOne();
    
    if (!settingsExist) {
      console.log('🔧 Creating system settings...');
      
      await SystemSettings.create({
        defaultInterestRate: 12,
        currentGoldRate: 6500,
        maxLoanAmount: 1000000,
        minLoanAmount: 10000,
        defaultLoanDuration: 30,
        autoApprovalLimit: 50000,
        companyName: 'GoldFlow Pro',
        companyEmail: 'admin@goldflow.com',
        companyPhone: '9876543210',
        businessHours: '9:00 AM - 6:00 PM (Mon-Sat)',
        emailNotifications: true,
        smsNotifications: true,
        overdueReminders: true,
        approvalAlerts: true,
        penaltyRate: 2,
        processingFeeRate: 1,
        renewalFeeRate: 0.5
      });

      console.log('✅ System settings created successfully');
    } else {
      console.log('✅ System settings already exist');
    }

  } catch (error) {
    console.error('❌ Error initializing admin:', error);
  }
};

module.exports = { initializeAdmin };

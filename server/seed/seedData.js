const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const User = require('../models/User');
const connectMongo = require('../config/db');

const users = [
  {
    name: 'Admin User',
    email: 'admin@railways.gov.in',
    password: 'admin123',
    role: 'admin',
    department: 'Administration',
    designation: 'Chief Operations Manager',
    zone: 'Northern Railway',
    division: 'Delhi'
  },
  {
    name: 'Rajesh Kumar (SSE/P.Way)',
    email: 'engineering@railways.gov.in',
    password: 'eng123',
    role: 'engineering',
    department: 'Engineering',
    designation: 'Senior Section Engineer (P.Way)',
    zone: 'Northern Railway',
    division: 'Delhi'
  },
  {
    name: 'Suresh Sharma (SSE/TRD)',
    email: 'trd@railways.gov.in',
    password: 'trd123',
    role: 'trd',
    department: 'Traction Distribution',
    designation: 'Senior Section Engineer (TRD)',
    zone: 'Northern Railway',
    division: 'Delhi'
  },
  {
    name: 'Amit Verma (SSE/Sig)',
    email: 'signal@railways.gov.in',
    password: 'sig123',
    role: 's_and_t',
    department: 'Signal & Telecom',
    designation: 'Senior Section Engineer (Signal)',
    zone: 'Northern Railway',
    division: 'Delhi'
  },
  {
    name: 'Control Office Viewer',
    email: 'control@railways.gov.in',
    password: 'control123',
    role: 'control_office',
    department: 'Control Office',
    designation: 'Section Controller',
    zone: 'Northern Railway',
    division: 'Delhi'
  }
];

const seedUsers = async () => {
  try {
    await connectMongo();
    console.log('MongoDB connected for seeding');

    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Create users
    for (const userData of users) {
      await User.create(userData);
      console.log(`✅ Created user: ${userData.email} (${userData.role})`);
    }

    console.log('\n📋 Demo Credentials:');
    console.log('─'.repeat(50));
    for (const u of users) {
      console.log(`  ${u.role.padEnd(16)} → ${u.email} / ${u.password}`);
    }
    console.log('─'.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seedUsers();

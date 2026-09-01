const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Department = require('./models/Department');
const Employee = require('./models/Employee');
const Warehouse = require('./models/Warehouse');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Supplier = require('./models/Supplier');
const Customer = require('./models/Customer');
const Account = require('./models/Account');
const Setting = require('./models/Setting');
const Tax = require('./models/Tax');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp_system';
    console.log(`Connecting to MongoDB for Seeding at ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('Clearing existing database collections...');
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      Employee.deleteMany({}),
      Warehouse.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Supplier.deleteMany({}),
      Customer.deleteMany({}),
      Account.deleteMany({}),
      Setting.deleteMany({}),
      Tax.deleteMany({}),
    ]);

    console.log('Seeding System Users...');
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@example.com',
      password: 'Admin@123',
      role: 'Super Admin',
      status: 'Active',
      permissions: ['*'],
    });

    const hrUser = await User.create({
      name: 'Sarah Jenkins',
      email: 'hr@example.com',
      password: 'Admin@123',
      role: 'HR Manager',
      status: 'Active',
    });

    const accountantUser = await User.create({
      name: 'Robert Vance',
      email: 'accountant@example.com',
      password: 'Admin@123',
      role: 'Accountant',
      status: 'Active',
    });

    const inventoryUser = await User.create({
      name: 'Marcus Brody',
      email: 'inventory@example.com',
      password: 'Admin@123',
      role: 'Inventory Manager',
      status: 'Active',
    });

    console.log('Seeding Departments...');
    const itDept = await Department.create({ name: 'Information Technology', code: 'IT', location: 'Floor 3', manager: adminUser._id });
    const hrDept = await Department.create({ name: 'Human Resources', code: 'HR', location: 'Floor 2', manager: hrUser._id });
    const finDept = await Department.create({ name: 'Finance & Accounting', code: 'FIN', location: 'Floor 2', manager: accountantUser._id });
    const salesDept = await Department.create({ name: 'Sales & Marketing', code: 'SALES', location: 'Floor 1' });
    const invDept = await Department.create({ name: 'Inventory & Warehousing', code: 'INV', location: 'Warehouse A', manager: inventoryUser._id });

    console.log('Seeding Employees...');
    await Employee.create([
      {
        employeeId: 'EMP-1001',
        user: hrUser._id,
        firstName: 'Sarah',
        lastName: 'Jenkins',
        email: 'hr@example.com',
        phone: '+1 555 123 4567',
        department: hrDept._id,
        designation: 'HR Lead',
        salary: 85000,
      },
      {
        employeeId: 'EMP-1002',
        user: accountantUser._id,
        firstName: 'Robert',
        lastName: 'Vance',
        email: 'accountant@example.com',
        phone: '+1 555 987 6543',
        department: finDept._id,
        designation: 'Senior Accountant',
        salary: 92000,
      },
      {
        employeeId: 'EMP-1003',
        user: inventoryUser._id,
        firstName: 'Marcus',
        lastName: 'Brody',
        email: 'inventory@example.com',
        phone: '+1 555 456 7890',
        department: invDept._id,
        designation: 'Inventory Supervisor',
        salary: 78000,
      },
    ]);

    console.log('Seeding Warehouses...');
    const mainWarehouse = await Warehouse.create({
      name: 'Main Distribution Hub',
      code: 'WH-MAIN',
      location: 'Building A, Industrial Zone',
      capacity: 50000,
    });
    const secondaryWarehouse = await Warehouse.create({
      name: 'East Coast Storage',
      code: 'WH-EAST',
      location: 'Port Terminal 4',
      capacity: 25000,
    });

    console.log('Seeding Categories...');
    const electronicsCat = await Category.create({ name: 'Electronics', description: 'Computing equipment & gadgetry' });
    const laptopsCat = await Category.create({ name: 'Laptops', parentCategory: electronicsCat._id });
    const accessoriesCat = await Category.create({ name: 'Accessories', parentCategory: electronicsCat._id });

    console.log('Seeding Products...');
    const p1 = await Product.create({
      sku: 'LAP-001',
      name: 'MacBook Pro 16" M3 Max',
      description: 'High performance laptop for engineering and design',
      category: laptopsCat._id,
      brand: 'Apple',
      unit: 'pcs',
      purchasePrice: 2800,
      sellingPrice: 3499,
      stockQuantity: 45,
      minimumStock: 10,
      warehouse: mainWarehouse._id,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300',
    });

    const p2 = await Product.create({
      sku: 'LAP-002',
      name: 'Dell XPS 15 Touch',
      description: 'Ultra thin workstation with OLED display',
      category: laptopsCat._id,
      brand: 'Dell',
      unit: 'pcs',
      purchasePrice: 1600,
      sellingPrice: 2100,
      stockQuantity: 8, // Low stock demo!
      minimumStock: 10,
      warehouse: mainWarehouse._id,
      image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=300',
    });

    const p3 = await Product.create({
      sku: 'ACC-001',
      name: 'Logitech MX Master 3S',
      description: 'Ergonomic Wireless Performance Mouse',
      category: accessoriesCat._id,
      brand: 'Logitech',
      unit: 'pcs',
      purchasePrice: 65,
      sellingPrice: 99,
      stockQuantity: 120,
      minimumStock: 25,
      warehouse: secondaryWarehouse._id,
      image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=300',
    });

    console.log('Seeding Suppliers...');
    await Supplier.create({
      name: 'John Miller',
      company: 'TechCorp International Ltd',
      email: 'sales@techcorp.com',
      phone: '+1 (800) 555-0199',
      address: '400 Silicon Parkway, San Jose, CA',
      paymentTerms: 'Net 30',
    });

    console.log('Seeding Customers...');
    await Customer.create([
      {
        customerId: 'CUST-1001',
        name: 'Enterprise Solutions LLC',
        company: 'Global Tech Systems',
        email: 'billing@globaltech.com',
        phone: '+1 (555) 444-3322',
        address: '500 Corporate Blvd, New York, NY',
        creditLimit: 50000,
      },
      {
        customerId: 'CUST-1002',
        name: 'Horizon Retailers',
        company: 'Horizon Chain Stores',
        email: 'orders@horizon.com',
        phone: '+1 (555) 777-8899',
        address: '12 Market Square, Chicago, IL',
        creditLimit: 30000,
      },
    ]);

    console.log('Seeding Chart of Accounts (COA)...');
    await Account.create([
      { code: '1010', name: 'Cash and Bank Deposits', type: 'Asset', balance: 150000 },
      { code: '1100', name: 'Accounts Receivable', type: 'Asset', balance: 25000 },
      { code: '1200', name: 'Inventory Asset', type: 'Asset', balance: 85000 },
      { code: '2010', name: 'Accounts Payable', type: 'Liability', balance: 18000 },
      { code: '4010', name: 'Sales Revenue', type: 'Revenue', balance: 210000 },
      { code: '5010', name: 'Salaries and Wages Expense', type: 'Expense', balance: 65000 },
      { code: '5020', name: 'Office Rent & Utilities', type: 'Expense', balance: 12000 },
    ]);

    console.log('Seeding System Settings...');
    await Setting.create({
      companyName: 'Acme Global Enterprise ERP',
      companyEmail: 'admin@acme-erp.com',
      currency: 'USD',
      currencySymbol: '$',
      timezone: 'America/New_York',
    });

    console.log('Seeding Taxes...');
    await Tax.create([
      { name: 'Standard Sales Tax (10%)', code: 'VAT10', rate: 10 },
      { name: 'Reduced Tax Rate (5%)', code: 'VAT5', rate: 5 },
    ]);

    console.log('\n==========================================');
    console.log('DATABASE SEEDED SUCCESSFULLY!');
    console.log('==========================================');
    console.log('Super Admin Credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: Admin@123');
    console.log('==========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('DATABASE SEEDING FAILED:', error.message);
    process.exit(1);
  }
};

seedDatabase();

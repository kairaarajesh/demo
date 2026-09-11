require("dotenv").config();
const express = require('express');
const cors = require('cors');
const { connectMongo } = require('./config/database');
const app = express();


const PORT = process.env.PORT || 6000;

// Middleware - IMPORTANT: Don't comment out json()
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/client-bills', require('./routes/clientBills'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/services', require('./routes/services'));
app.use('/api/service-combos', require('./routes/serviceCombos'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/products', require('./routes/products'));
app.use('/api/reports', require('./routes/reports'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    await connectMongo();
    app.listen(PORT, () => {
      console.log(`Salon CRM Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
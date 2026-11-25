const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('tiny'));

// used by docker, the deploy pipeline and the uptime monitor
app.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'down',
    version: process.env.APP_VERSION || 'dev',
    uptime: Math.round(process.uptime()),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
});

module.exports = app;

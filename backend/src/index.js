require('dotenv').config();
const express = require('express');
const cors = require('cors');

const salesRouter     = require('./routes/sales');
const inventoryRouter = require('./routes/inventory');
const employeesRouter = require('./routes/employees');
const shiftsRouter    = require('./routes/shifts');
const tasksRouter     = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/sales',     salesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/shifts',    shiftsRouter);
app.use('/api/tasks',     tasksRouter);

app.listen(PORT, () => console.log(`StoreMind backend running on port ${PORT}`));

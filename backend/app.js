// Import routes
const listRoutes = require('./routes/kanban/listRoutes');
const cardRoutes = require('./routes/kanban/cardRoutes'); // Add this line

// Use routes
app.use('/api/v1', listRoutes);
app.use('/api/v1', cardRoutes); // Add this line to register card routes

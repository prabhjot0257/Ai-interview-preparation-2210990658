require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const passport = require('passport');

const connectDB = require('./config/db');
require('./middleware/passport')(passport);

const authRoutes = require('./routes/auth');
const interviewRoutes = require('./routes/interviews');
const questionRoutes = require('./routes/questions');
const answerRoutes = require('./routes/answers');
const aiRoutes = require('./routes/ai');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect DB
connectDB().then(() => {
  app.listen(PORT, () => { });
  console.log(`Server running on port ${PORT}`);
});
// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/ai', aiRoutes);
app.use("/api/analytics", require("./routes/analytics"));


// Error handler
app.use(errorHandler);


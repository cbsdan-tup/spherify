require('dotenv').config();

const express = require('express');
const app = express()
const path = require('path')

const { logger, logEvents } = require('./middleware/logger')
const errorHandler = require('./middleware/errorHandler')

const cors = require("cors");
const connectDatabase = require('./config/database')

const mongoose = require('mongoose')
const PORT = process.env.PORT || 8000

const cloudinary = require('cloudinary')

const account = require('./routes/account');
const teamRoutes = require('./routes/teamRoutes');
const messageRoutes = require('./routes/messageRoutes')

console.log(process.env.NODE_ENV) 

connectDatabase()

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

//middleware
app.use(express.json({limit:'50mb'}))
app.use(express.urlencoded({limit: "50mb", extended: true }));
app.use(logger)

app.use(cors())

app.use('/', express.static(path.join(__dirname, 'public')))
app.use(errorHandler)

// Routes
app.use('/', require('./routes/root'))
app.use('/api/v1', account);
app.use('/api/v1', teamRoutes);
app.use('/api/v1', messageRoutes);

//404 not found routes
app.all('*', (req, res) => {
    res.status(404)
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'views', '404.html'))
    } else if (req.accepts('json')) {
        res.json({ message: '404 Not Found' })
    } else {
        res.type('txt').send('404 Not Found')
    }
})

mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB')
    app.listen(PORT, () => console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`))
})

mongoose.connection.on('error', err => {
    console.log(err)
    logEvents(`${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`, 'mongoErrLog.log')
})

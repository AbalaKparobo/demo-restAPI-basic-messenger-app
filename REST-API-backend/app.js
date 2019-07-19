const path = require('path');

const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const feedRoute = require('./routes/feed');
const authRoute = require('./routes/auth');
const app = express();

const DB_URI = process.env.DB_URI

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now().toString() + '-' + file.originalname)
    }
})
const filterFile = (req, file, cb) => {
    if(file.mimetype === 'image/png' ||
       file.mimetype === 'image/jpg' ||
       file.mimetype === 'image/jpeg') {
        return cb(null, true)
    }
    return cb(null, false);
}
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
app.use(bodyParser.json());
app.use(multer({storage: fileStorage, fileFilter: filterFile}).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use('/feed', feedRoute);
app.use('/auth', authRoute);


app.use((error, req, res,next) => {
    console.log(error)
    const status = error.statusCode || 500;
    const message = error.message;
    res.status(status).json({message: message});
})
mongoose.connect(DB_URI)
.then(res => {
    const server = app.listen(8080)
    const io = require('./socket').init(server);
    io.on('connection', socket => {
        console.log('Client has connected');
    })
}).catch(err => console.log(err))
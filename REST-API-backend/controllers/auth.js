const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator/check');

const User = require('../models/user');

exports.signup = (req, res, next)=> {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        const error = new Error('User signup validation failed')
        error.statusCode = 422;
        error.data = error.array();
        throw error;
    }
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;
    bcrypt.hash(password, 12)
      .then(hashedPassword => {
          const user = new User({
              email: email,
              password: hashedPassword,
              name: name
          })
          return user.save();
      })
      .then(newUser => {
          res.status(201).json({message: 'New user created successfully', userid: newUser._id})
      })
      .catch(err => {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err)
    })
}

exports.login = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let currentUser;
    User.findOne({email: email})
     .then(foundUser => {
         if(!foundUser) {
             const err = new Error('No User with this email found');
             err.statusCode = 401;
             throw err;
         }
         currentUser = foundUser;
         return bcrypt.compare(password, foundUser.password);
     })
     .then(correctPswd => {
         if(!correctPswd) {
             const err = new Error('Incorrect password');
             err.statusCode = 401;
             throw err;
         }
         const token = jwt.sign({email: currentUser.email, userId: currentUser._id}, process.env.jwt_secret, {expiresIn: '1h'});
         res.status(200).json({token: token, userId: currentUser._id.toString()})
     })
     .catch(err => {
        if(!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    })
}
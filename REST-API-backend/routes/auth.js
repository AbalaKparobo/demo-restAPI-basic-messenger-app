const express = require('express');
const { body } = require('express-validator/check');

const User = require('../models/user');
const authController = require('../controllers/auth');
const router = express.Router();

router.put('/signup', [
    body('email').isEmail().withMessage('Please enter a valid email address')
      .custom((val, { req }) => {
          return User.findOne({email: val}).then(DbUser => {
              if(DbUser) {
                  return Promise.reject('This Email already exist')
              }
          })
      }).normalizeEmail(),
      body('password').trim().isLength({min: 6}).withMessage('Password should be minimum of 6 characters'),
      body('name').trim().not().isEmpty()
], authController.signup);

router.post('/login', authController.login);

module.exports = router
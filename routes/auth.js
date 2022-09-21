const express = require('express');
const {
    check,
    body
} = require('express-validator');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login', [
        body('email')
        .isEmail()
        .withMessage('Please enter a valid email address.')
        .normalizeEmail(),
        body('password', 'Your password must be at least 5 characters long and contain only letters and numbers.')
        .isLength({
            min: 5
        })
        .isAlphanumeric()
        .trim()

    ],
    authController.postLogin
);

router.post(
    '/signup', [
        check('email')
        .isEmail()
        .withMessage('Please enter a valid email address.')
        .custom((value, {
            req
        }) => {
            return User.findOne({
                    email: value
                })
                .then(userDoc => {
                    if (userDoc) {
                        return Promise.reject(
                            'Email already exists.'
                        );
                    }
                });
        })
        .normalizeEmail(),
        body('password',
            'Your password must be at least 5 characters long and contain only letters and numbers.'
        )
        .isLength({
            min: 5
        })
        .isAlphanumeric()
        .trim(),
        body('confirmPassword')
        .trim()
        .custom((value, {
            req
        }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match!')
            }
            return true;
        })
    ],
    authController.postSignup
);

router.get('/logout', authController.postLogout);

// router.get('/reset', authController.getReset);

// router.post('/reset', authController.postReset);

// router.get('/reset/:token', authController.getNewPassword);

// router.post('/new-password', authController.postNewPassword);

module.exports = router;
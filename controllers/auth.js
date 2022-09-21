const crypto = require('crypto');
const fetch = require('node-fetch');
const bcrypt = require('bcryptjs');

const { validationResult } = require('express-validator');

const User = require('../models/user');
const userCtrl = require('../controllers/random');
const user = require('../models/user');
const { resolve } = require('path');

exports.getLogin = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Pictournal | Login',
        errorMessage: message,
        originalInput: {
            email: ''
        },
        validationErrors: []
    });
};

exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Pictournal | Signup',
        errorMessage: message,
        originalInput: {
            email: ''
        },
        validationErrors: []
    });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Pictournal | Login',
            errorMessage: errors.array()[0].msg,
            originalInput: {
                email: email
            },
            validationErrors: errors.array()
        });
    }
    User.findOne({
            email: email
        })
        .then(user => {
            if (!user) {
                return res.status(422).render('auth/login', {
                    path: '/login',
                    pageTitle: 'Pictournal | Login',
                    errorMessage: 'Invalid email or password.',
                    originalInput: {
                        email: email
                    },
                    validationErrors: []
                });
            }
            bcrypt.compare(password, user.password)
                .then(doMatch => {
                    if (doMatch) {
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        return req.session.save((err) => {
                            console.log(err);
                            res.redirect('/');
                        });
                    }
                    return res.status(422).render('auth/login', {
                        path: '/login',
                        pageTitle: 'Login',
                        errorMessage: 'Invalid email or password.',
                        originalInput: {
                            email: email
                        },
                        validationErrors: []
                    });
                })
                .catch(err => {
                    console.log(err);
                    res.redirect('/login');
                });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors.array())
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Pictournal | Signup',
            errorMessage: errors.array()[0].msg,
            originalInput: {
                email: email
            },
            validationErrors: errors.array()
        });
    }
    bcrypt
        .hash(password, 12)
        .then(hashedPassword => {
            const user = new User({
                email: email,
                password: hashedPassword,
            });
            return user.save();
        })
        .then(result => {
            res.redirect('/login');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};


exports.postLogout = (req, res, next) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
};

// exports.getReset = (req, res, next) => {
//     let message = req.flash('error');
//     if (message.length > 0) {
//         message = message[0];
//     } else {
//         message = null;
//     }
//     res.render('auth/reset', {
//         path: '/reset',
//         pageTitle: 'Pictournal | Reset Password',
//         errorMessage: message
//     });
// };

// exports.postReset = (req, res, next) => {
//     crypto.randomBytes(32, (err, buffer) => {
//         if (err) {
//             return res.redirect('/reset');
//         }
//         const token = buffer.toString('hex');
//         User.findOne({
//                 email: req.body.email
//             })
//             .then(user => {
//                 if (!user) {
//                     req.flash('error', 'No account with that email found.');
//                     return res.redirect('/reset');
//                 }
//                 user.resetToken = token;
//                 user.resetTokenExpiration = Date.now() + 3600000;
//                 return user.save();
//             })
//             .then(result => {
//                 res.redirect('/');
//             })
//             .catch(err => {
//                 const error = new Error(err);
//                 error.httpStatusCode = 500;
//                 return next(error);
//             });
//     });
// };

// Will need to add email function if we want, was causing errors so I held off for now.

// exports.getNewPassword = (req, res, next) => {
//     const token = req.params.token;
//     User.findOne({
//             resetToken: token,
//             resetTokenExpiration: {
//                 $gt: Date.now()
//             }
//         })
//         .then(user => {
//             let message = req.flash('error');
//             if (message.length > 0) {
//                 message = message[0];
//             } else {
//                 message = null;
//             }
//             res.render('auth/new-password', {
//                 path: 'new-password',
//                 pageTitle: 'Pictournal | New Password',
//                 errorMessage: message,
//                 userId: user._id.toString(),
//                 passwordToken: token
//             });
//         })
//         .catch(err => {
//             const error = new Error(err);
//             error.httpStatusCode = 500;
//             return next(error);
//         });
// };

// exports.postNewPassword = (req, res, next) => {
//     const newPassword = req.body.password;
//     const userId = req.body.userId;
//     const passwordToken = req.body.passwordToken;
//     let resetUser;

//     User.findOne({
//             resetToken: passwordToken,
//             resetTokenExpiration: {
//                 $gt: Date.now()
//             },
//             _id: userId
//         })
//         .then(user => {
//             resetUser = user;
//             return bcrypt.hash(newPassword, 12)
//         })
//         .then(hashedPassword => {
//             resetUser.password = hashedPassword;
//             resetUser.resetToken = undefined;
//             resetUser.resetTokenExpiration = undefined;
//             return resetUser.save();
//         })
//         .then(result => {
//             res.redirect('/login');
//         })
//         .catch(err => {
//             const error = new Error(err);
//             error.httpStatusCode = 500;
//             return next(error);
//         });
// };

exports.generateFakeUsers = (req, res, next) => {
    let settings = { method: "Get" };
    fetch('https://api.namefake.com/', settings)
        .then(res => res.json())
        .then((json) => {
            res = JSON.parse(JSON.stringify(json));
            console.log(res.name);
            return res;
        })
        .then(ranuser => {
            var password = 'test';
            bcrypt
                .hash(password, 12)
                .then(hashedPassword => {
                    const user = new User({
                        email: userCtrl.randomEmail(ranuser),
                        password: hashedPassword,
                        name: ranuser.name,
                        bio: userCtrl.randomBio(ranuser),
                        profileImgUrl: userCtrl.randomProfileImage(ranuser),
                    });
                    user.save();
                    var mxPost = Math.floor(Math.random() * (15 - 3) + 3);
                    for (var i = 0; i < mxPost; i++) {
                        userCtrl.randomPost(user);
                        this.sleep(200);
                    }
                    return user;
                })
                .catch(err => {
                    const error = new Error(err);
                    error.httpStatusCode = 500;
                    // return next(error);
                });
        })
        .catch((err) => {
            console.log(err);
        });
}

exports.generateFollows = async(req, res, next) => {
    let userId = [];
    let randomUserId = [];

    var sleep = (req, res, next) => {
        const date = Date.now();
        let currentDate = null;
        do {
            currentDate = Date.now();
        } while (currentDate - date < req);
    };

    // Fill up userId array
    User.find({}, async function(err, users) {
        if (!err) {
            /** This is for when you need to clear all follows because it got messed up. Generally not recommended */
            // for (thisUser in users) {
            //     users[thisUser].clearFollows();
            // }
            for (thisUser in users) {
                userId.push(users[thisUser].id);
            }

            for (thisUser in users) {
                const followerCount = Math.random() * 6 + 2;
                // for (var i = 0; i < followerCount; i++) {
                //     randomUserId.push(userId[Math.floor(Math.random() * userId.length)]);
                // }

                // for (let i = 0; i < randomUserId.length; i++) {
                //     await users[thisUser].followById(randomUserId[i]);
                //     sleep(200);
                // }
                randomUserId = [];
            }
            // console.log(users);
        } else {
            throw err;
        }
    });

};

exports.sleep = (req, res, next) => {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < req);
}
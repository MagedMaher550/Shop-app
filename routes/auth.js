const express = require('express');
const { check, body } = require("express-validator");
const bcrypt = require("bcryptjs");

const router = express.Router();

const passport = require("passport");
require("../passport-setup");

const User = require("../models/user");
const authController = require("../controllers/auth");

router.get('/login', authController.getLogin);

router.get("/google/:action", 
    passport.authenticate(
        "google",
        {
            accessType: 'offline',
            prompt: 'consent',
            scope: ["profile", "email"]
        }
    )
);

router.get('/google/callback', 
    passport.authenticate(
        'google', 
        { 
            failureRedirect: '/404'
        },
        authController.googelAuthCallback
    )
);


router.get('/signup', authController.getSignup);

router.get('/reset', authController.getReset);

router.get('/reset/:token', authController.getnewPassword);

router.post('/login', authController.postLogin);

router.post(
    '/signup',
    [
     check("email")
        .isEmail()
        .withMessage("Please Enter a Valid Email.")
        .custom(value => {
            return User.findOne({email: value}).then(user => {
                if(user) {
                    return Promise.reject("This Email is already used.");
                }
            })
        })
        .custom(value => {
            if(!(value.includes('@') && value.includes('.'))){
                throw new Error("Please add a valied email address.");
            } else if(value.split('@')[1].split('.')[0] != "gmail" &&  value.split('@')[1].split('.')[0] != "yahoo") {
                throw new Error("This email domain is not accepted.");
            } else {
                return true;
            }
        }),
    body("password")
        .isLength({min: 8, max: 20})
        .withMessage("Please Enter a password of length between 8 and 20 characters.")
        .isAlphanumeric()
        .withMessage("Please Enter a password of only letters and numbers"),
    body("confirmPassword")
        .custom((value, {req}) => {
            if(value !== req.body.password) {
                throw new Error("Passwords do not match.");
            } else {
                return true;
            }
        })
    ]
        ,authController.postSignup
);

router.post('/logout', authController.postLogout);

router.post('/reset', authController.postReset);

router.post(
    '/new-password',
    [
        body("password")
            .isLength({min: 8, max: 20})
            .withMessage("Please Enter a password of length between 8 and 20 characters.")
            .isAlphanumeric()
            .withMessage("Please Enter a password of only letters and numbers"),

        body("confirmPassword")
            .custom((value, {req}) => {
                if(value !== req.body.password) {
                    throw new Error("Passwords do not match.");
                } else {
                    return true;
                }
            })
    ]
    ,authController.postNewPassword
);

module.exports = router;
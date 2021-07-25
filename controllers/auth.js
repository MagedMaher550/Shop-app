const crypto = require("crypto");

const session = require("express-session");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendGridTransport = require("nodemailer-sendgrid-transport");
const { validationResult } = require("express-validator");

const User = require("../models/user");

const throwServerError = require("../util/serverErrorThrower");

const transporter = nodemailer.createTransport(sendGridTransport({
    auth: {
        api_key: "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"
    }
}));

const errorMessageHandler = message => {
    if(message.length > 0){
        message = message[0];
    } else {
        message = null;
    }
    return message;
}

exports.redirectToGoogelAuthSuccess = (req, res, next) => {
    const action = req.query.action || "signup";
    const userId = req.user.id;
    const userEmail = req.user.email;
    let user;

    console.log(action);

    if(action.toString() === "login") {
        User.findOne({email: userEmail})
            .then(user => {
                if(!user) { 
                    req.flash("error", "Email Not Found, Please Sign Up First");
                    return res.status(422).render("auth/signup", {
                        path: '/signup',
                        pageTitle: "Signup",
                        errorMessage: "Email Not Found, Please Sign Up First",
                        oldInput: {
                            email: userEmail,
                            password: userId
                        },
                        validationErrors: []
                    });                    
                }
                bcrypt.compare(userId, user.password)
                .then(result => {
                    if(result) {
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        return req.session.save(err => {
                            console.log(err);
                            res.redirect("/");
                        });
                    } else {    //if the google account id is not equal to the id stored in the database
                        req.flash("error", "Something Went Wrong, Please Try Again Later.");
                        return res.status(422).render("auth/login", {
                            path: '/login',
                            pageTitle: "Login",
                            errorMessage: "Invalid email or password",
                            oldInput: {
                                email: email,
                                password: password
                            },
                            validationErrors: []
                        });
                    }
                })
            })
    } else if(action.toString() === "signup") {
        bcrypt
        .hash(userId, 12)
        .then(hashedPassword => {
             user = new User({
                email: userEmail,
                password: hashedPassword,
                cart: {
                    items: [],
                    totalPrice: 0
                }
            });
            return user.save();
        })
        .then(result => {
            return transporter.sendMail({
                to: userEmail,
                from: "magedmaher373@gmail.com",
                subject: "Sign Up Confirmation",
                html: "<h1> You Have Sucessfully Signed Up!</h1>"
            });
        })
        .then(result => {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save(err => {
                console.log(err);
                res.redirect("/");
            });
        })
        .catch(err => {
            console.log(err);
            return throwServerError(next,err);
          });
    }
}


exports.getLogin = (req, res, next) => {
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: errorMessageHandler(req.flash("error")),
        oldInput: {
            email: "",
            password: "",
        },
        validationErrors: []
    });
};

exports.getSignup = (req, res, next) => {
    res.render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: errorMessageHandler(req.flash("error")),
      oldInput: {
        email: "",
        password: "",
        confirmPassword: ""
      },
      validationErrors: []
    });
  };

 exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    const errorMsgs = [];
    const confirmPassword = req.body.confirmPassword;

    if(!errors.isEmpty()) {
        errors.array().forEach(err => {
            errorMsgs.push(err.msg);
        });
        console.log(errors.array());
        return res.status(422).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errorMsgs,
            oldInput: {
                email: email,
                password: password,
                confirmPassword: confirmPassword
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
                cart: {
                    items: [],
                    totalPrice: 0
                }
            });
            return user.save()
        }) 
        .then(result => {
            return transporter.sendMail({
                to: email,
                from: "magedmaher373@gmail.com",
                subject: "Sign Up Confirmation",
                html: "<h1> You Have Sucessfully Signed Up!</h1>"
            });
        })
        .then(result => {
            req.session.isLoggedIn = true;
            return req.session.save(err => {
                console.log(err);
                res.redirect("/");
            });
        })
        .catch(err => {
            console.log(err);
            return throwServerError(next,err);
          });
 };

exports.postLogin = (req, res, next) => {

    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);

    if(!errors.isEmpty) {
        return res.status(422).render("auth/login", {
            path: '/login',
            pageTitle: "Login",
            errorMessage: "Invalid email or password",
            oldInput: {
                email: email,
                password: password
            },
            validationErrors: []
        });
    }

    User.findOne({email: email})
        .then(user => {
            if(!user) {
                req.flash("error", "Invalid email or password.");
                return res.status(422).render("auth/login", {
                    path: '/login',
                    pageTitle: "Login",
                    errorMessage: "Invalid email or password",
                    oldInput: {
                        email: email,
                        password: password
                    },
                    validationErrors: []
                });
            } else {
                bcrypt.compare(password, user.password)
                    .then(result => {
                        if(result) {
                            req.session.isLoggedIn = true;
                            req.session.user = user;
                            return req.session.save(err => {
                                console.log(err);
                                res.redirect("/");
                            });
                        } else {
                            req.flash("error", "Invalid email or password.");
                            return res.status(422).render("auth/login", {
                                path: '/login',
                                pageTitle: "Login",
                                errorMessage: "Invalid email or password",
                                oldInput: {
                                    email: email,
                                    password: password
                                },
                                validationErrors: []
                            });
                        }
                    })
                    .catch(err => {
                        console.log(err);
                        return res.redirect("/login");
                    })
            }
        })
        .catch(err => {
            console.log(err);
            return throwServerError(next,err);
          });
};

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect("/");
    })
};

exports.getReset = (req, res, next) => {
    res.render('auth/password-reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: errorMessageHandler(req.flash("error"))
        
    });
}

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
      if (err) {
        console.log(err);
        return res.redirect('/reset');
      }
      const token = buffer.toString('hex');
      User.findOne({ email: req.body.email })
        .then(user => {
          if (!user) {
            req.flash('error', 'No account with that email found.');
            return res.redirect('/reset');
          }
          user.resetToken = token;
          user.resetTokenExpiration = Date.now() + 5*60*1000 //after five minutes from now;
          return user.save();
        })
        .then(result => {
            res.redirect("/");
            return transporter.sendMail({
                to: req.body.email,
                from: "magedmaher373@gmail.com",
                subject: "Resetting Password",
                html: `
                    <p> You Requested to reset the email </p>
                    <p> Click on the following link to reset it </p>
                    <a href='http://localhost:3000/reset/${token}'> Link </a>
                `
            });   
        })
        .catch(err => {
            console.log(err);
            return throwServerError(next,err);
          });
    });
  };

  exports.getnewPassword = (req, res ,next) => {
    const token = req.params.token;
    User.findOne({
        resetToken: token,
        resetTokenExpiration: {
            $gt: Date.now()
        }
    })
    .then(user => {
        if(!user) {
            return res.redirect("/reset")
        }
        res.render('auth/new-password', {
            path: '/new-password',
            pageTitle: 'New Password',
            errorMessage: errorMessageHandler(req.flash("error")),
            userId: user._id.toString(),
            passwordToken: token,
            oldInput: {
                password: '',
                confirmPassword: ''
            }
        });
    })
    .catch(err => {
        console.log(err);
        return throwServerError(next,err);
      });
  }

  exports.postNewPassword = (req, res, next) => {
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    const errorMsgs = [];
    let resetUser;

    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        errors.array().forEach(err => {
            errorMsgs.push(err.msg);
        });
        return res.status(422).render("auth/new-password", {
            path: '/login',
            pageTitle: "Login",
            errorMessage: errorMsgs,
            userId: userId,
            passwordToken: passwordToken,
            oldInput: {
                password: password,
                confirmPassword: confirmPassword
            }
        });
    }
    User.findOne({
        resetToken: passwordToken,
        resetTokenExpiration: {
            $gt: Date.now()
        },
        _id: userId
    })
    .then(user => {
        resetUser = user;
        return bcrypt.hash(password, 12);
    })
    .then(hashedPassword => {
        resetUser.password = hashedPassword;
        resetUser.resetToken = undefined;
        resetUser.resetTokenExpiration = undefined;
        return resetUser.save();
    })
    .then(result => {
        return res.redirect("/login");
    })
    .catch(err => {
        console.log(err);
        return throwServerError(next,err);
      });
  };
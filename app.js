const path = require('path');
const fs = require("fs");
const https = require("https");

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
const uuid = require("uuid");

const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const passport = require("passport");

require('dotenv').config()

const errorController = require('./controllers/error');
const User = require('./models/user');

// const  MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@node-example-1.b86q3.mongodb.net/${process.env.MONGO_DATABASE_NAME}?retryWrites=true&w=majority`;
const  MONGODB_URI = `mongodb+srv://node-example-1-user:node-example-1-user@node-example-1.b86q3.mongodb.net/shop?retryWrites=true&w=majority`;

const app = express();

app.use(passport.initialize());
app.use(passport.session());

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
   {flags: 'a'}
);


// app.use(helmet());
app.use(compression());
app.use(morgan("combined",{stream: accessLogStream}));

const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions"
});

const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './images');
  },
  filename: (req, file, cb) => {
    cb(null, uuid.v4() + file.originalname);
  }
});
  
  
const fileFilter = (req, file, cb) => {
  if(file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg") {
    cb(null, true);
  } else {
    cb(null, false);
  }
}

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: false }));

app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'));

app.use(express.static(path.join(__dirname, 'public')));
app.use("/images", express.static(path.join(__dirname, 'images')));

app.use(session({
  secret: "my secret", // should be a long string
  resave: false,
  saveUninitialized: false,
  store: store
}));

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next()
});

app.use((req, res, next) => {
  if(!req.session.user)
  return next();
  User.findById(req.session.user._id)
  .then(user => {
    if(!user) {
      return next();
    }
      req.user = user;
      next();
    })
    .catch(err => {
      console.log(err);
      next(new Error(err));
    });
});


app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use('/500', errorController.get500);
app.use(errorController.get404);

app.use( (error, req, res, next) => {
  console.log(error);
  res.status(500).render('500', {
    pageTitle: 'Server Error!',
    path: '/500',
  });
})

mongoose
  .connect(MONGODB_URI, { useUnifiedTopology: true, useNewUrlParser: true})
  .then(result => {
    // https.createServer({
    //   key: privateKey,
    //   cert: certificate
    // }, app)
    app.listen(process.env.PORT || 8080);
  })
  .catch(err => {
    console.log(err);
  });

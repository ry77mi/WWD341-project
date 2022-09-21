 const path = require('path');
 require('custom-env').env('staging');
 const PORT = process.env.PORT || 5000;

 const express = require('express');
 const mongoose = require('mongoose');
 const session = require('express-session');
 const mongoDBStore = require('connect-mongodb-session')(session);
 const bodyParser = require('body-parser');
 const flash = require('connect-flash');
 const multer = require('multer');

 const User = require('./models/user');
 const authCtrl = require('./controllers/auth'); // For my random generator testing
 const errorController = require('./controllers/error');

 const MONGO_USER = process.env.DB_USER;
 const MONGO_PASS = process.env.DB_PASS;

 const MONGODB_URL = "mongodb+srv://" + MONGO_USER + ":" + MONGO_PASS + "@cluster0.2scof.mongodb.net/pictournal"

 const store = new mongoDBStore({
     uri: MONGODB_URL,
     collection: 'sessions'
 });

 const fileStorage = multer.diskStorage({
     destination: (req, file, cb) => {
         cb(null, 'images');
     },
     filename: (req, file, cb) => {
         cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
     }
 });

 const fileFilter = (req, file, cb) => {
     if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
         cb(null, true);
     } else {
         cb(null, false);
     }
 };

 const app = express();
 const mainRouter = require('./routes/main');
 const userRouter = require('./routes/user');
 const authRouter = require('./routes/auth');

 app.set('view engine', 'ejs');
 app.set('views', 'views');
 app.use(bodyParser.urlencoded({ extended: false }));
 app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));
 app.use(express.static(path.join(__dirname, 'public')));
 app.use('/images', express.static(path.join(__dirname, 'images')));
 app.use(
     session({
         secret: 'my secret',
         resave: false,
         saveUninitialized: false,
         store: store
     })
 );

 // ENABLE TO CREATE 1 new user and between 3 and 15 random posts. 
 // ----------------------------------------------------------------------------
 //  authCtrl.generateFakeUsers();
 // ----------------------------------------------------------------------------
 // May take a minute with the sleep delay (ensures posts aren't repeats)

 //  ENABLE TO CREATE follows for all users in the database
 //  ----------------------------------------------------------------------------
 //  authCtrl.generateFollows();
 //  ----------------------------------------------------------------------------
 //  Also takes a minute for sleep delay

 app.use(flash());

 app.use((req, res, next) => {
     res.locals.isAuthenticated = req.session.isLoggedIn;
     next();
 });

 app.use((req, res, next) => {
     if (!req.session.user) {
         return next();
     }
     User.findById(req.session.user._id)
         .then(user => {
             if (!user) {
                 return next();
             }
             req.user = user;
             next();
         })
         .catch(err => {
             const error = new Error(err);
             error.httpStatusCode = 500;
             return next(error);
         });
 });

 app.use(mainRouter);
 app.use(userRouter);
 app.use(authRouter);

 app.get('/500', errorController.get500);

 app.use(errorController.get404);

 app.use((error, req, res, next) => {
     res.status(500).render('500', {
         pageTitle: 'An Error Occurred',
         path: '/500',
         isAuthenticated: req.session.isLoggedIn,
         user: req.user
     });
 });

 mongoose
     .connect(MONGODB_URL)
     .then(result => {
         app.listen(PORT);
     })
     .catch(err => {
         const error = new Error(err);
         error.httpStatusCode = 500;
         return next(error);
     });
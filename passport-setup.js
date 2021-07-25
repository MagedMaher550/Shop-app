const passport = require("passport");
const GoogleStratgey = require("passport-google-oauth2").Strategy;

passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((user, done) => done(null, user))

passport.use(new GoogleStratgey({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
}, (request, accessToken, refreshToken, profile, done) => {    
        return done(null, profile);
}))
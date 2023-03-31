const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../schemas/user');

const GoogleConfigServices = (passport) => {
    passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL,
        passReqToCallback: true,

    }, async (accessToken, refreshToken, profile, done) => {
        try{
            let existingUser = await User.findOne({ 'google.id': profile.id });

            if(existingUser){
                return done(null, existingUser);
            }

           const newUser = await User.create({
                google: {
                    id: profile.id,
                    name: profile.displayName,
                    email: profile.emails[0].value
                }
            });
            await newUser.save();
           return done(null, newUser);
        }catch(err){
            console.log(err);
        }
    }))
}

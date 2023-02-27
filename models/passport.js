const express = require("express");
//LocalAuth 
const session = require('express-session');
const passport = require('passport');
const passportLocaMongoose = require('passport-local-mongoose');
const LocalStrategy=require("passport-local").Strategy
//google Oauth
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
//-------
const User = require("./users")
const router=express.Router();


///LocalAuth and for google
passport.serializeUser(function(user, done){
    done(null, user.id)
});
passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user)
    })
});
passport.use(new LocalStrategy(User.authenticate()));
// -----------end LocalAuth


//google Auth
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log(profile);
    User.findOne({ googleId: profile.id }, function (err, user) {
      if(err){
        return done(err);
      }
       if(!user){
        const newUser= new User({
            googleId:profile.id,
            // email:profile.emails[0].value,
            name:profile.displayName
        });
        newUser.save((err)=>{
            if(err){
                return done(err);
            }
            return done(null,newUser);
        });
      }else{
        return done(null,user);
      }
        
    });
  }
));


//get google auth
router.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] })
  );

  router.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    User.findOne({ _id: req.user._id}, function (err, user) {
      if(err){
        return done(err);
      }
       if(!user.fName){
        res.redirect("/submit");
       
      }else{
        // Successful authentication, redirect secrets.
    res.redirect("/welcome");
      }
        
    });
   
  });

  
  router.get("/logout", function(req,res){
    //method comes from passport
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
    });
    router.post("/login", function(req,res){
        const user = new User({
         username: req.body.username,
         password: req.body.password
        });
     
        //login()method comes from passport
        req.login(user, function(err){
         if(err){
             console.log(err);
         }else{
             passport.authenticate("local")(req,res, function(){
                 res.redirect("welcome");
             });
         }
        })
     });

     
    
    router.post("/register", function(req,res){
        //register( methods comes from passport local mongoose)
         User.register({username: req.body.username}, req.body.password, function(err,user){
            if(err){
                console.log(err);
                res.redirect("/register")
            } else {
                passport.authenticate("local")(req, res, function(){
                    res.redirect("/submit")
                })
        
            }
         })  
        
           
        });

        router.get("/login", function(req,res){
            res.render("login");
        });
        router.get("/register", function(req,res){
            res.render("register");
        });

  module.exports=router;

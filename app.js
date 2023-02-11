require("dotenv").config()
const express = require("express");
const bodyParser = require("body-parser");
const func = require(__dirname + "/js/functions.js")
const ejs = require("ejs");

const mongoose = require('mongoose');
const { stringify } = require("querystring");

//Lession386 
const session = require('express-session');
const passport = require('passport');
const passportLocaMongoose = require('passport-local-mongoose');
//google Oauth
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
//-------

const app = express();
app.use(express.static("public"))
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));


//Lession386 
app.use(session({
  secret: "type any thing",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
//-------

// new connection and new database 
mongoose.connect('mongodb://127.0.0.1:27017/cryptoWalletDB', {useNewUrlParser: true});



//new Schema
const apiSchema =  new mongoose.Schema({
  rank: Number,
  cryptoName : String,
  symbol : String,
  cryptoPrice: {type: Number},
  percent_change_1h: {type: Number},
  percent_change_24h: {type: Number},
  percent_change_7d: {type: Number},
  cryptoId: String,
  logo: String,
  favourite:Boolean
 })

 const entrySchema = new mongoose.Schema({
  id:Number,
  date: String,
  time: String,
  side: String,
  name: String,
  amount:Number,
  buyPricePerCoin: Number,
  buyPriceInTotal: Number,
  currentPricePerCoin: Number,
  currentPriceInTotal: Number,
  profit: Number
  
 })

 //user auth
const userSchema =  new mongoose.Schema({
  username : String,
  password : String,
  googleId: String,
  secret: String,
  transactions: [entrySchema],
  favouriteList: [apiSchema]
 })
//----auth

//Lession386 
userSchema.plugin(passportLocaMongoose);
userSchema.plugin(findOrCreate);

//new model
const LiveData = mongoose.model("LiveData", apiSchema)
const Entry = mongoose.model("Entry",entrySchema)

//auth
const User = mongoose.model("User", userSchema)
    //Lession386 
    passport.use(User.createStrategy());

    passport.serializeUser(function(user, done){
      done(null, user.id)
  });
  passport.deserializeUser(function(id, done){
      User.findById(id, function(err, user){
          done(err, user)
      })
  }); 

  //google Auth
  passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile.displayName);
    User.findOrCreate({ googleId: profile.id , username:profile.displayName}, function (err, user) {
      return cb(err, user);
    });
  }
));

// ---auth

function updateData(){
  // get the Data from API source
  func.getApi(function(data){
    
    for (let i = 0; i < data.data.length; i++) {
   const cryptoId = data.data[i].id
      const logo = "https://s2.coinmarketcap.com/static/img/coins/64x64/" + cryptoId + ".png"
     

     //first time to save data

    //  const api = new LiveData({
    //   rank: data.data[i].cmc_rank,
    //     cryptoName: data.data[i].name,
    //     symbol: data.data[i].symbol,
    //     cryptoPrice:Number(data.data[i].quote.USD.price),//func.currency
    //     percent_change_1h: (data.data[i].quote.USD.percent_change_1h),//func.percent
    //     percent_change_24h: (data.data[i].quote.USD.percent_change_24h),//func.percent
    //     percent_change_7d: (data.data[i].quote.USD.percent_change_7d),//func.percent
    //     cryptoId: cryptoId,
    //     logo: logo
    //  });
    //  api.save()

      LiveData.findOneAndUpdate({cryptoId:cryptoId},{
        rank: data.data[i].cmc_rank,
        cryptoName: data.data[i].name,
        symbol: data.data[i].symbol,
        cryptoPrice:(data.data[i].quote.USD.price),//func.currency
        percent_change_1h: (data.data[i].quote.USD.percent_change_1h),//func.percent
        percent_change_24h: (data.data[i].quote.USD.percent_change_24h),//func.percent
        percent_change_7d: (data.data[i].quote.USD.percent_change_7d),//func.percent
        cryptoId: cryptoId,
        logo: logo
      },function(err,res){
        if(err){
          console.log(err); 
        }
      })
    }
    });
  };

updateData();


//-----------------Home-------------------------//
app.get("/", function (req, res) {
  
   updateData()
        LiveData.find({},function(err,data){
          if(!err){
             res.render("home", { apiDatas: data })
          }else {
            console.log(err);
          }
         
        }).sort({rank:1})
  
    })
  
  


app.post("/", function(req,res){

const checkedItemId =(req.body.checkbox).trim() ;
  if (req.isAuthenticated()){
  // Find the object you want to push
LiveData.findById({_id:checkedItemId}, function(err, obj) {
  if (err) return handleError(err);
  
  // Push the object to the other model .... $addToSet add if not exist .... instead $push duplicate
  User.findByIdAndUpdate({_id:req.user._id}, { $addToSet: { favouriteList: obj } }, function(err) {
    if (err) return handleError(err);
  });
});
res.redirect("/")
   }else{
    res.redirect("/login")
   }
 
 


// LiveData.findOneAndUpdate({cryptoName:checkedItemId}, 
//   {$set:{favourite:true}},function(err, results){
//   if(!err){
//    console.log("successfully added to favourite");
// } else {
//   console.log(err);
// }
//  res.redirect("/")
// })
})

//-----------------Faovourite-------------------------//
app.get("/favourite", function(req,res){
  updateData()
  if (req.isAuthenticated()){
 User.findById({_id:req.user._id}, function(err,foundUser){
    if (err){
        console.log(err);
    } else {
      res.render("favourite", { apiDatas: foundUser.favouriteList })
    }
          
       
      }).sort({"favouriteList.rank":1})
  }else{
    res.redirect("/login")
   }
   

 }); 
 
 

app.post("/favourite", function(req,res){

  
    if (req.isAuthenticated()){

      // get the id value from favourite.ejs
      const checkedItemId =(req.body.checkbox).trim() ;
    
    // delete object from favouritList Array
    User.updateOne({"favouriteList._id":checkedItemId}, { $pull: { favouriteList: {_id:checkedItemId} } }, function(err) {
      if (err){
        console.log(err);
      } else{
        console.log("succesfully deleted checked item!"); 
         res.redirect("/favourite")
      }
    });
 
     }else{
      res.redirect("/login")
     }

 
});

//-----------------New Entry-------------------------//
app.get("/newEntry", function (req, res) {

  //check if user logged?
  if (req.isAuthenticated()){
    //get coins name
     LiveData.find({},function(err,results){
    if(err){
      console.log(err);
    }else{
      res.render("newEntry", { apiDatas: results, success:"" })
    }
  })  
   }else{
    res.redirect("/login")
   }

 

  
  
})

app.post("/newEntry", function (req, res) {

  

  const perCoin=req.body.checkboxPerCoin;
 const inToltal=req.body.checkBoxInToltal;
 var amount =(req.body.amount)
 var buyPrice =(req.body.cost)
var priceTotal = (amount * buyPrice)
const pricePerCoin=( buyPrice / amount)
 
//check if user logged?
if (req.isAuthenticated()){
  

   User.findById({_id:req.user._id}, function(err,foundUser){
   if (err){
       console.log(err);
   } else {
       if (foundUser){
        if(perCoin=="on"){
           foundUser.transactions.push({
            time: req.body.time,
            date: req.body.date,
            side: req.body.side,
            name: req.body.cryptoList,
            amount:(amount) ,//func.longNumber
            buyPricePerCoin: (buyPrice),//func.currency
            buyPriceInTotal: (priceTotal),//func.currency
            profit:"0"
           }) 
          } else if(inToltal=="on"){
            foundUser.transactions.push({
              //id:func.idIncrement(),
              time: req.body.time,
                date: req.body.date,
                side: req.body.side,
                name: req.body.cryptoList,
                amount:(amount) ,//func.longNumber
                buyPricePerCoin: (pricePerCoin),//func.currency
                buyPriceInTotal: (buyPrice),//func.currency
                profit:"0"
             })
          
       }
       foundUser.save(function(){
       
    });
   }}
  })

 }else{
  res.redirect("/login")
 }


 
 
 // const newEntry
 
// if(perCoin=="on"){
//   const entry = new Entry({
//   //id:func.idIncrement(),
//   time: req.body.time,
//     date: req.body.date,
//     side: req.body.side,
//     name: req.body.cryptoList,
//     amount:func.longNumber(amount) ,
//     buyPricePerCoin: func.currency(buyPrice),
//     buyPriceInTotal: func.currency(priceTotal),
//     profit:"0"
    
//  })
//  entry.save()
// }else if(inToltal=="on"){
//   const entry = new Entry({
//     //id:func.idIncrement(),
//     time: req.body.time,
//       date: req.body.date,
//       side: req.body.side,
//       name: req.body.cryptoList,
//       amount:func.longNumber(amount) ,
//       buyPricePerCoin: func.currency(pricePerCoin),
//       buyPriceInTotal: func.currency(buyPrice),
//       profit:"0"
//    })
//     entry.save()
// }

LiveData.find({},function(err,results){
  if(err){
    console.log(err);
  }else{
    res.render("newEntry", { apiDatas: results, success:"New Transaction Saved Successfully!" })
  }
})  



  //entry.push(newEntry)
 
 
  //res.render("newEntry", { apiDatas: apiData, success:" New Transaction Saved Successfully!" })
//res.redirect("/newEntry")
})

//-----------------My Entry-------------------------//
app.get("/myentries", function (req, res) {

//check if user logged?
if (req.isAuthenticated()){
  updateData();
//get user
  User.findById({_id:req.user._id}, function(err,foundUser){
  if (err){
      console.log(err);
  } else {
      if (foundUser){
     //update current price
        async function updateUserTransactionPrices() {
          const liveData = await LiveData.find({});
          const users = await User.find({_id:foundUser._id});
        
          for (let i = 0; i < users.length; i++) {
            for (let j = 0; j < users[i].transactions.length; j++) {
              const apiTransaction = liveData.find(
                t => t.cryptoName === users[i].transactions[j].name
              );
              if (apiTransaction) {
                users[i].transactions[j].currentPricePerCoin = apiTransaction.cryptoPrice;
                users[i].transactions[j].currentPriceInTotal =  users[i].transactions[j].amount * users[i].transactions[j].currentPricePerCoin;
                users[i].transactions[j].profit =users[i].transactions[j].currentPriceInTotal - users[i].transactions[j].buyPriceInTotal
                await users[i].save();
              }
            }
          }
        }
        
         updateUserTransactionPrices();
        
  User.find({_id:foundUser._id},function(err,results){
    if(err){
      console.log(err);
    }else{
      results.forEach(element => {
        res.render("myentries", {  newEntries: element.transactions })
      });
      
     
    }
  })  
 
  }}
 })

}else{
 res.redirect("/login")
}

});

//POST MYENTRY
app.post("/myentries", function(req,res){
 
  if (req.isAuthenticated()){
     //delete selected object
    const ObjectId =(req.body.delete).trim() ;
console.log(ObjectId);
 User.updateOne({"transactions._id":ObjectId},{$pull:{transactions:{_id:ObjectId}}}, function(err){
  if(err){
    console.log(err); 
  } else {
    console.log("succesfully deleted checked item!"); 
    res.redirect("/myentries")
  }
 
 })
   }else{
    res.redirect("/login")
   }
 
});

//-----------------Dashboard-------------------------//
app.get("/dashboard", function(req,res){

  if (req.isAuthenticated()){

    // User.findById({_id:req.user._id}, function(err,foundUser){}) to spesific user
    
    User.findById({_id:req.user._id}, function(err,foundUser){

      User.aggregate([
        {
          $match:{
           
            "_id":foundUser._id //filter data by user id
          }
        },
        {
          $unwind:"$transactions"   // to open the array
        },
       
        {
          $group: {
            _id:"$transactions.name", //gruop by name
            totalAmount: {
              $sum: {
                $subtract:[ //total Amount (buy) - total Amount (sell)
                    { $cond:[{$eq:[ "$transactions.side", "BUY"]},"$transactions.amount", 0 ]},
               { $cond:[{$eq:[ "$transactions.side", "SELL"]},"$transactions.amount", 0 ]}
                ]
             
              }
          },
          totalInvestment: {
            $sum: {
              $subtract:[ //total buyPriceInTotal (buy) - (sell)
                  { $cond:[{$eq:[ "$transactions.side", "BUY"]},"$transactions.buyPriceInTotal", 0 ]},
             { $cond:[{$eq:[ "$transactions.side", "SELL"]},"$transactions.buyPriceInTotal", 0 ]}
              ]
           
            }
        
      }, totalAmountBuyAndSell:{$sum:"$transactions.amount"},
      currentValuePerCoin:{$first:"$transactions.currentPricePerCoin"},
},
         
      },
     { $lookup:{
        from: "livedatas",
        localField:"_id",
        foreignField: "cryptoName",
        as: "dashDocs",
       
       }},
       { $set:{percent_change_7d:"$dashDocs.percent_change_7d", logo:"$dashDocs.logo"}},
      { "$project": {
       
        totalInvestment:1,
        totalAmount:1,
        totalAmountBuyAndSell:1,
        currentValuePerCoin:1,
         currentValueInTotal: {$multiply:[ "$currentValuePerCoin","$totalAmount"]},
        avrgBuyPrice: {$divide:["$totalInvestment","$totalAmount"]},
        profit:{$subtract:["$currentValueInTotal","$totalInvestment"]},
        dashDocs:1,
        percent_change_7d:1,
        logo:1
      }},
      {
        "$project": {
       
          totalInvestment:1,
          totalAmount:1,
          totalAmountBuyAndSell:1,
          currentValuePerCoin:1,
           currentValueInTotal:1,
          avrgBuyPrice: 1,
          profit:{$subtract:["$currentValueInTotal","$totalInvestment"]},
          dashDocs:1,
          percent_change_7d:1,
          logo:1
    
        }
      },
      {
        "$project": {
       
          totalInvestment:1,
          totalAmount:1,
          totalAmountBuyAndSell:1,
          currentValuePerCoin:1,
           currentValueInTotal:1,
          avrgBuyPrice: 1,
          profit:1,
          roi:{$divide:["$profit","$totalAmountBuyAndSell"]},
          dashDocs:1,
          percent_change_7d:1,
          logo:1,
    
        }

      },
     
     
      ])
      .sort({ "_id":1}).exec(function(err,results){console.log(results);
      
          res.render("dashboard", {dashboard: results })
        })

});
        
  }else{
   res.redirect("/login")
  }

 
});

app.post("/dashboard", function(req,res){
   const logo = req.body.logo
   //check if user logged?
   if (req.isAuthenticated()){
    res.redirect("/myentries")

    
   }else{
    res.redirect("/login")
   }

 

  
 
});

//get google auth
app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] })
  );

  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  });

//-----------------Get login & register-------------------------//
app.get("/login", function(req,res){
  res.render("login");
});
app.get("/register", function(req,res){
  res.render("register");
});


app.get("/secrets", function(req,res){
  if (req.isAuthenticated()){
      User.findById({_id:req.user._id}, function(err,foundUser){
      if(err){
          console.log(err);
      } else {
          if(foundUser){
              res.render("secrets", {name:foundUser.username})
              console.log(foundUser);
          } 
        
      }
  })
     }else{
      res.redirect("/login")
     }

  //to find all secret not equal null
  
});

app.get("/submit", function(req,res){
  if (req.isAuthenticated()){
      res.render("submit")
     }else{
      res.redirect("/login")
     }
});

app.post("/submit", function(req,res){
 const submittedSecret = req.body.secret;
 console.log(req.user);

 User.findById({_id:req.user._id}, function(err,foundUser){
  if (err){
      console.log(err);
  } else {
      if (foundUser){
          foundUser.secret = submittedSecret;
          foundUser.save(function(){
              res.redirect("/secrets")
          });
      }
  }
 })

});

//_________386___________
app.get("/logout", function(req,res){
//method comes from passport
req.logout(function(err) {
  if (err) { return next(err); }
  res.redirect('/');
});
});


app.post("/login", function(req,res){
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
          res.redirect("secrets");
      });
  }
 })
})

app.post("/register", function(req,res){
//register( methods comes from passport local mongoose)
User.register({username: req.body.username}, req.body.password, function(err,user){
  if(err){
      console.log(err);
      res.redirect("/register")
  } else {
      passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets")
      })

  }
})  

 
})

app.listen("3000", function () {
  console.log("server is running...")
})
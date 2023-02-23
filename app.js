require("dotenv").config()
const express = require("express");
const bodyParser = require("body-parser");
const func = require(__dirname + "/js/functions.js")
const ejs = require("ejs");
var _ = require('lodash');

//__binance
const Binance = require('node-binance-api');

const mongoose = require('mongoose');
const { stringify } = require("querystring");

//LocalAuth 
const session = require('express-session');
const passport = require('passport');
//const passportLocaMongoose = require('passport-local-mongoose');
const User = require("./models/users")
const auth=require("./models/passport");
const isAuth=require("./models/isAuth");
//LocalAuth and for google
const app = express();
app.use(express.static(__dirname +"public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

//LocalAuth and for google
app.use(session({
    secret: "type any thing",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use("/",auth)
//-------




// new connection and new database 
mongoose.connect('mongodb://127.0.0.1:27017/cryptoWalletDB', {useNewUrlParser: true});



// binance.exchangeInfo((error, data) => {
//   if (error) {
//     console.error(error);
//     return;
//   }
//   const symbols = data.symbols.map(symbol => symbol.symbol);
//   symbols.forEach(symbol => {
//     binance.trades(symbol, (error, trades) => {
//       if (error) {
//         console.error(error);
//         return;
//       }
//       console.log(trades);
//     });
//   });
// });


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


//new model
const LiveData = mongoose.model("LiveData", apiSchema)


function updateData(){
  // get the Data from API source
  func.getApi(function(data){
    
    for (let i = 0; i < data.data.length; i++) {
   const cryptoId = data.data[i].id
      const logo = "https://s2.coinmarketcap.com/static/img/coins/64x64/" + cryptoId + ".png"
     

     //first time to save data

     const api = new LiveData({
      rank: data.data[i].cmc_rank,
        cryptoName: data.data[i].name,
        symbol: data.data[i].symbol,
        cryptoPrice:Number(data.data[i].quote.USD.price),//func.currency
        percent_change_1h: (data.data[i].quote.USD.percent_change_1h),//func.percent
        percent_change_24h: (data.data[i].quote.USD.percent_change_24h),//func.percent
        percent_change_7d: (data.data[i].quote.USD.percent_change_7d),//func.percent
        cryptoId: cryptoId,
        logo: logo
     });
     api.save()

      // LiveData.findOneAndUpdate({cryptoId:cryptoId},{
      //   rank: data.data[i].cmc_rank,
      //   cryptoName: data.data[i].name,
      //   symbol: data.data[i].symbol,
      //   cryptoPrice:(data.data[i].quote.USD.price),//func.currency
      //   percent_change_1h: (data.data[i].quote.USD.percent_change_1h),//func.percent
      //   percent_change_24h: (data.data[i].quote.USD.percent_change_24h),//func.percent
      //   percent_change_7d: (data.data[i].quote.USD.percent_change_7d),//func.percent
      //   cryptoId: cryptoId,
      //   logo: logo
      // },function(err,res){
      //   if(err){
      //     console.log(err); 
      //   }
      // })
    }
    });
  };

updateData();


//-----------------Home-------------------------//
app.get("/", function (req, res) {
  
  
   updateData()
        LiveData.find({},function(err,data){
          if(!err){
            //check if user logged?
   if (req.isAuthenticated()){
    User.findById({_id:req.user._id}, function(err,foundUser){
      if (err){
          console.log(err);
      } else {
        res.render("home", { apiDatas: data, user: foundUser })
      }});
     // if user not logged?
   }else{
    res.render("home", { apiDatas: data })
   }     
          }else {
            console.log(err);
          }
         
        }).sort({rank:1})
  
    })
  
  

//-----------------Faovourite-------------------------//

app.get("/favourite",isAuth.ensureAuthenticated, function(req,res){
  
    updateData()
    User.findById({_id:req.user._id}, function(err,foundUser){
      User.aggregate([
        {
          $match:{
            "_id":foundUser._id //filter data by user id
          }
        },
     { $lookup:{
        from: "livedatas",
        localField:"favouriteList",
        foreignField: "_id",
        as: "favourite",
       }},
       {
        $unwind:"$favourite"   // to open the array
      },
       { "$project": {
        
        favourite:1
       }},
     
      ])
      .exec(function(err,results){
        if(err){console.log(err);
        }else{

 res.render("favourite", {apiDatas: results, user: foundUser })
          }
        })
});    
  
 }); 

app.post('/favorite/add/:id',isAuth.ensureAuthenticated, async (req, res) => {
  

const favorite = await User.findByIdAndUpdate(
  {_id:req.user._id}, // find the first (and only) favorite document
    { $addToSet: { favouriteList: req.params.id } }, // add the item to the favorite list
    { upsert: true, new: true } // create the document if it doesn't exist
  ).populate('favouriteList'); // populate the favorite list with the full item documents
  res.json({ favorite });
  
});

app.post('/favorite/remove/:id',isAuth.ensureAuthenticated, async (req, res) => {
  
  const favorite = await User.findByIdAndUpdate(
    {_id:req.user._id},
    { $pull: { favouriteList: req.params.id } }, // remove the item from the favorite list
    { new: true }
  ).populate('favouriteList');
  res.json({ favorite });
 
 
});

app.post("/favourite",isAuth.ensureAuthenticated, function(req,res){

  
  
 console.log(req.body.checkbox);  
      // get the id value from favourite.ejs
      const checkedItemId =(req.body.checkbox).trim() ;
     
    console.log(typeof(checkedItemId));
    // delete object from favouritList Array
    User.updateOne({_id:req.user._id}, { $pull: { favouriteList:checkedItemId } }, function(err) {
      if (err){
        console.log(err);
      } else{
        console.log("succesfully deleted checked item!"); 
         res.redirect("/favourite")
      }
    });
 
    

 
});

//-----------------New Entry-------------------------//
app.get("/newEntry", isAuth.ensureAuthenticated,function (req, res) {

  //check if user logged?
 
    //get coins name
     LiveData.find({},function(err,results){
    if(err){
      console.log(err);
    }else{
      
      User.findById({_id:req.user._id}, function(err,foundUser){
        if (err){
            console.log(err);
        } else {

      res.render("newEntry", { apiDatas: results, success:"" ,user: foundUser})
        }
      })
    }
  })  
   

 

  
  
})

app.post("/newEntry",isAuth.ensureAuthenticated, function (req, res) {

  

  const perCoin=req.body.checkboxPerCoin;
 const inToltal=req.body.checkBoxInToltal;
 var amount =(req.body.amount)
 var buyPrice =(req.body.cost)
var priceTotal = (amount * buyPrice)
const pricePerCoin=( buyPrice / amount)
 
//check if user logged?

  
   LiveData.find({},function(err,results){
      if(err){
        console.log(err);
      }else{
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
        res.render("newEntry", { apiDatas: results, user: foundUser, success:"New Transaction Saved Successfully!" })
    });
 
       
      }
    }})  
   }})
  


 
 
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





  //entry.push(newEntry)
 
 
  //res.render("newEntry", { apiDatas: apiData, success:" New Transaction Saved Successfully!" })
//res.redirect("/newEntry")
})

//-----------------My Entry-------------------------//
app.get("/myentries",isAuth.ensureAuthenticated, function (req, res) {


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
                users[i].transactions[j].symbol = apiTransaction.symbol;
                users[i].transactions[j].logo = apiTransaction.logo;
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
        res.render("myentries", {  newEntries: element.transactions, user: foundUser })
      });
      
     
    }
  })  
 
  }}
 })



});

//POST MYENTRY
app.post("/myentries",isAuth.ensureAuthenticated, function(req,res){
 
 
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
  
 
});

//-----------------Dashboard-------------------------//
app.get("/dashboard",isAuth.ensureAuthenticated, function(req,res){

 

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
       { $set:{percent_change_7d:"$dashDocs.percent_change_7d", logo:"$dashDocs.logo", symbol:"$dashDocs.symbol"}},
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
        logo:1,
        symbol:1
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
          logo:1,
          symbol:1
    
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
          symbol:1
    
        }

      },
     
     
      ])
      .sort({ "_id":1}).exec(function(err,results){
      
          res.render("dashboard", {dashboard: results, user: foundUser })
        })

});
        
 

 
});

app.post("/dashboard",isAuth.ensureAuthenticated, function(req,res){
  //convert var to kebab case to read it in url
   const logo = _.toLower(req.body.logo)
   //check if user logged?
   
    res.redirect("/myentries/"+(logo) )

   
 
});


app.get("/myentries/:logo",isAuth.ensureAuthenticated,function(req,res){
  //return var value to original status
  const logo =_.toUpper(req.params.logo)

 
   
    
    User.findById({_id:req.user._id } ,function(err,foundUser){
      if(foundUser){
        
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
            $match:{"transactions.symbol":logo

            }
         },
         { $set:{trans:"$transactions"}},
        {
          "$project": {
            trans:1
           
          } 
        } 
         
        ]).exec(function(err,results){
       res.render("dashboardSelected", {  newEntries: results,user: foundUser })
        })
     
  
        
      }else {
        console.log(err);
      }
    })
 
})




app.get("/secrets",isAuth.ensureAuthenticated, function(req,res){
  
      User.findById({_id:req.user._id}, function(err,foundUser){
      if(err){
          console.log(err);
      } else {
          if(foundUser){
              res.render("secrets", {name:foundUser.fName,user: foundUser})
             
          } 
        
      }
  })
    

  //to find all secret not equal null
  
});

app.get("/submit",isAuth.ensureAuthenticated, function(req,res){
  
      res.render("submit")
    


     //if (req.isAuthenticated()){
      //   User.findById({_id:req.user._id}, function(err,foundUser){
      //     if(err){
      //         console.log(err);
      //     } else {
      //         if(foundUser.fName ==null && foundUser.lName ==null){
                 
      //             res.render("submit")
      //         } else{res.redirect("/") }
            
      //     }
      // })
         
      //    }else{
      //     res.redirect("/login")
      //    }
});

app.post("/submit",isAuth.ensureAuthenticated, function(req,res){
 const fName = req.body.fName;
 const lName = req.body.lName;
 console.log(req.user);

 User.findById({_id:req.user._id}, function(err,foundUser){
  if (err){
      console.log(err);
  } else {
      if (foundUser){
          foundUser.fName = fName;
          foundUser.lName = lName;
          foundUser.save(function(){
              res.redirect("/wallet")
          });
      }
  }
 })

});

app.get("/wallet",isAuth.ensureAuthenticated, function(req,res){

  
    User.findById({_id:req.user._id}, function(err,foundUser){
    if(err){
        console.log(err);
    } else {
        if(foundUser){
            res.render("wallet", {name:foundUser.fName,user: foundUser})
           
        } 
      
    }
})
   


  
});
app.post("/wallet",isAuth.ensureAuthenticated, function(req,res){
  const wallet = req.body.wallet;
  User.findById({_id:req.user._id}, function(err,foundUser){
   if (err){
       console.log(err);
   } else {
       if (foundUser){
           foundUser.walletName = wallet;
           foundUser.save(function(){
               res.redirect("/secrets")
           });
       }
   }
  })
 
 });

 //change name
 app.get("/change-name",isAuth.ensureAuthenticated, function(req,res){
  
  
    User.findById({_id:req.user._id}, function(err,foundUser){
    if(err){
        console.log(err);
    } else {
        if(foundUser){
            res.render("changeName", {name:foundUser.fName,user: foundUser})
           
        } 
      
    }
})
   

});

app.post("/change-name",isAuth.ensureAuthenticated, function(req,res){
 const fName = req.body.fName;
 const lName = req.body.lName;
 console.log(req.user);

 User.findById({_id:req.user._id}, function(err,foundUser){
  if (err){
      console.log(err);
  } else {
      if (foundUser){
          foundUser.fName = fName;
          foundUser.lName = lName;
          foundUser.save(function(){
              res.redirect("/profile")
          });
      }
  }
 })

});

//change wallet name
app.get("/change-wallet-name",isAuth.ensureAuthenticated, function(req,res){

  
    User.findById({_id:req.user._id}, function(err,foundUser){
    if(err){
        console.log(err);
    } else {
        if(foundUser){
            res.render("changeWallet", {name:foundUser.fName,user: foundUser})
           
        } 
      
    }
})


  
});
app.post("/change-wallet-name",isAuth.ensureAuthenticated, function(req,res){
  const wallet = req.body.wallet;
  User.findById({_id:req.user._id}, function(err,foundUser){
   if (err){
       console.log(err);
   } else {
       if (foundUser){
           foundUser.walletName = wallet;
           foundUser.save(function(){
               res.redirect("/profile")
           });
       }
   }
  })
 
 });



//profile
app.get("/profile",isAuth.ensureAuthenticated, function (req,res){

  
        User.findById({_id:req.user._id}, function(err,foundUser){
          if(err){
              console.log(err);
          } else {
              res.render("profile", {user: foundUser})
          }
      })
         
        
 
});
app.post("/profile",isAuth.ensureAuthenticated, function(req,res){
  
   User.findByIdAndDelete({_id:req.user._id}, function(err){
   if (err){
       console.log(err);
   } else {
    
        res.render("/")
    }
  })  

});

app.get("/import-data-from-binance",isAuth.ensureAuthenticated,function(req,res){


     func.exchangeInfo(function(data){
res.render("import", {apiDatas: data, success:""})    
  })
      
 
});

app.post("/import-data-from-binance",isAuth.ensureAuthenticated, function(req,res){
  const apiKey=req.body.key;
const secret =req.body.secret;
const tradePair =req.body.pairs

  

    const binance = new Binance().options({
      APIKEY:apiKey,
      APISECRET:secret,
      'family': 4,
      useServerTime: true,
      recvWindow: 60000, // Set a higher recvWindow to increase response timeout
      verbose: true,
      log: log => {
        console.log(log); // You can create your own logger here, or disable console output
      }
    });
    
    binance.trades(tradePair, (error, trades, symbol) => {
      if(error){
        console.log(error.statusMessage);
      }else{
       
        func.exchangeInfo(function(data){
         data.map(e=>{
          if(e.symbol==symbol){
            const symbols =e.baseAsset;
            LiveData.findOne({symbol:symbols},function(err,results){
              if(err){
                console.log(err);
              }else{
             const name=(results.cryptoName);  



trades.map(e=>{
 const id = e.id
const date = new Date(e.time);
const  year= date.getFullYear();
const month= date.getMonth();
const day = date.getDate();
const hour= date.getHours();
const minutes= date.getMinutes();
const seconds = date.getSeconds();
const newDate= year+"-"+month+"-"+day;
const time=hour+":"+minutes+":"+seconds;
const  side= e.isBuyer == false ? "SELL" : "BUY";

 const amount=e.qty;
const  buyPricePerCoin=e.price;
 const buyPriceInTotal=e.quoteQty;
 const newObjs=[{
  id:id,
  date: newDate,
  time: time,
  side:side,
  name:name,
  amount:amount,
  buyPricePerCoin:buyPricePerCoin,
  buyPriceInTotal:buyPriceInTotal
 }]
newObjs.map(obj=>{
   User.findOneAndUpdate({_id:req.user._id, "transactions.id":{$ne:obj.id}},
            {$addToSet:{transactions:newObjs}},
            { upsert: true, new:true, useFindAndModify:false},
            function(err,newObj){
            if(err){
              console.log(err);
            }else if(!newObj){
              console.log("no Transactions found");
            }else{
              console.log(newObj.length +"Transactions Found");
            }
           })
})
 
// User.findOne({_id:req.user._id,"transactions.id":{$ne:newObjs.id}},function(err,obj){
// if(err){
//   console.log(err);
// }else{
//   console.log(obj);
// }
// })
  
  
})
       


              
              }
            })


              
          }

         
         })    
            })

        //  console.info(symbol+" trade history", trades);
      }
      
    });
    // console.log(apiKey,secret,tradePair);
    res.redirect("/import-data-from-binance")
    
      
 
});
app.listen("3000", function () {
  console.log("server is running...")
})
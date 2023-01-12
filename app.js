require("dotenv").config()
const express = require("express");
const bodyParser = require("body-parser");
const func = require(__dirname + "/functions.js")
const https = require('https');
const mongoose = require('mongoose');
const { stringify } = require("querystring");
const app = express();
app.use(express.static("public"))
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
// new connection and new database 
mongoose.connect('mongodb://127.0.0.1:27017/cryptoWalletDB', {useNewUrlParser: true});

const start = 1
const limit = 300
const convert = "USD"
const apiKey = process.env.API_KEY
const url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=" + start + "&limit=" + limit + "&convert=" + convert + "&CMC_PRO_API_KEY=" + apiKey


//new Schema
const apiSchema =  new mongoose.Schema({
  rank: Number,
  cryptoName : String,
  symbol : String,
  cryptoPrice: String,
  percent_change_1h: String,
  percent_change_24h: String,
  percent_change_7d: String,
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
  amount:String,
  buyPricePerCoin: String,
  buyPriceInTotal: String,
  currentPricePerCoin: String,
  currentPriceInTotal: String,
  profit: String
  
 })
//new model
const LiveData = mongoose.model("LiveData", apiSchema)
const Entry = mongoose.model("Entry",entrySchema)

// fetch Api function
async function getData(callback){
  try{
  let res = await fetch(url)
  let data = await res.json()
 
    callback(data)
  }
  
 
  catch(err) {console.log(err);}
}

function updateData(){

  // get the Data from API source
  getData(function(data){
    for (let i = 0; i < limit; i++) {

      const cryptoId = data.data[i].id
      const logo = "https://s2.coinmarketcap.com/static/img/coins/64x64/" + cryptoId + ".png"

     
      LiveData.findOneAndUpdate({cryptoName: data.data[i].name,},{
        rank: data.data[i].cmc_rank,
        cryptoName: data.data[i].name,
        symbol: data.data[i].symbol,
        cryptoPrice: func.currency(data.data[i].quote.USD.price),
        percent_change_1h: func.percent(data.data[i].quote.USD.percent_change_1h),
        percent_change_24h: func.percent(data.data[i].quote.USD.percent_change_24h),
        percent_change_7d: func.percent(data.data[i].quote.USD.percent_change_7d),
        cryptoId: cryptoId,
        logo: logo
      },function(err,res){
        if(err){
          console.log(err); 
        }
      })
    }
    });
}


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

LiveData.findOneAndUpdate({cryptoName:checkedItemId}, 
  {$set:{favourite:true}},function(err, results){
  if(!err){
   console.log("successfully added to favourite");
} else {
  console.log(err);
}
 res.redirect("/")
})
})

//-----------------Faovourite-------------------------//
app.get("/favourite", function(req,res){
  updateData()
LiveData.find({favourite:true},function(err,results){
  if(err){
    console.log(err);
  }else{
     res.render("favourite", { apiDatas: results })
  }
})  
 }); 
 
 

app.post("/favourite", function(req,res){
 
  const checkedItemId =(req.body.checkbox).trim() ;
  LiveData.findOneAndUpdate({cryptoName:checkedItemId}, 
    {$set:{favourite:false}},function(err, results){
    if(!err){
     console.log("successfully removed from favourite");
  } else {
    console.log(err);
  }
   res.redirect("/favourite")
  })
});

//-----------------New Entry-------------------------//
app.get("/newEntry", function (req, res) {
  LiveData.find({},function(err,results){
    if(err){
      console.log(err);
    }else{
      res.render("newEntry", { apiDatas: results, success:"" })
    }
  })  

  
  
})

app.post("/newEntry", function (req, res) {
 // const newEntry
 const perCoin=req.body.checkboxPerCoin;
 const inToltal=req.body.checkBoxInToltal;
 var amount =(req.body.amount)
 var buyPrice =(req.body.cost)
var priceTotal = (amount * buyPrice)
const pricePerCoin=( buyPrice / amount)
if(perCoin=="on"){
  const entry = new Entry({
  //id:func.idIncrement(),
  time: req.body.time,
    date: req.body.date,
    side: req.body.side,
    name: req.body.cryptoList,
    amount:func.longNumber(amount) ,
    buyPricePerCoin: func.currency(buyPrice),
    buyPriceInTotal: func.currency(priceTotal),
    
 })
 entry.save()
}else if(inToltal=="on"){
  const entry = new Entry({
    //id:func.idIncrement(),
    time: req.body.time,
      date: req.body.date,
      side: req.body.side,
      name: req.body.cryptoList,
      amount:func.longNumber(amount) ,
      buyPricePerCoin: func.currency(pricePerCoin),
      buyPriceInTotal: func.currency(buyPrice),
      
   })
    entry.save()
}

    



  //entry.push(newEntry)
 
 
  //res.render("newEntry", { apiDatas: apiData, success:" New Transaction Saved Successfully!" })
res.redirect("/newEntry")
})

//-----------------My Entry-------------------------//
app.get("/myentries", function (req, res) {
 updateData();
 LiveData.find({},function(err,res){
  if(!err){
    res.forEach(coin => {
    
      Entry.updateMany({name:coin.cryptoName},{$set:{currentPricePerCoin:coin.cryptoPrice}},function(err){
        if(err){
          console.log((err));
        }
      })
    });
     Entry.find({},function(err,res){
  if(!err){
    res.forEach(objeck => {
      
      const currentPriceInTotal=(parseFloat(objeck.currentPricePerCoin.replaceAll('.', '').replaceAll(',', '.'))) * (parseFloat(objeck.amount.replaceAll('.', '').replaceAll(',', '.')))
      
      const profit= currentPriceInTotal - (parseFloat(objeck.buyPriceInTotal.replaceAll('.', '').replaceAll(',', '.'))) 

    
     Entry.findByIdAndUpdate({_id:objeck._id},{$set:{currentPriceInTotal:func.currency(currentPriceInTotal), 
      profit:func.currency(profit)}},function(err){
      if(err){
        console.log((err));
      }
    })
    });
  }
 })
  }else{
    console.log(err);
  }
 });



  Entry.find({},function(err,results){
    if(err){
      console.log(err);
    }else{
      res.render("myentries", {  newEntries: results })
    }
  })  
});

app.post("/myentries", function(req,res){
 
  const ObjectId =(req.body.delete).trim() ;

 Entry.findOneAndRemove({_id:ObjectId}, function(err){
  if(err){
    console.log(err); 
  } else {
    console.log("succesfully deleted checked item!"); 
    res.redirect("/myentries")
  }
 
 })
});





app.listen("3000", function () {
  console.log("server is running...")
})

//d9477a9a-2fb6-48cf-9b30-73f3916b5eb7
//'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=10c&convert=USD
//https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&CMC_PRO_API_KEY=d9477a9a-2fb6-48cf-9b30-73f3916b5eb7&limit=1&convert=BUSD
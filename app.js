const express =require ("express");
const bodyParser = require("body-parser");
const https = require('https')
const app = express();
app.use(express.static("public"))
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));

const start= 1
const limit =20
const convert ="USD"
const apiKey= "d9477a9a-2fb6-48cf-9b30-73f3916b5eb7"
const url="https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start="+start+"&limit="+limit+"&convert="+convert+"&CMC_PRO_API_KEY="+apiKey


const crRank=[];
const crName=[];
const crPrice=[];
const percentChange1Hr=[];
const percentChange24Hr=[];
const percentChange7d=[];
const NumberFormat =new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'USD',maximumSignificantDigits: 4 }).format

function formatAsPercent(num) {
    return new Intl.NumberFormat('default', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num / 100);
  }
 app.get("/", function(req,res){

    fetch(url).then(async function (response) {
        try {
         const data = await response.json()
    
         for (let i = 0; i < limit; i++) {
          var icon= data
            var rank =data.data[i].cmc_rank
            var cryptoName= data.data[i].name
            var symbole = data.data[i].symbol
            var cryptoPrice= NumberFormat(data.data[i].quote.USD.price)
           var percent_change_1h= formatAsPercent(data.data[i].quote.USD.percent_change_1h) 
           var percent_change_24h= formatAsPercent(data.data[i].quote.USD.percent_change_24h)
           var percent_change_7d= formatAsPercent(data.data[i].quote.USD.percent_change_7d)
            
            crRank.push(rank)
            crName.push(cryptoName+" " +symbole)
            crPrice.push(cryptoPrice)
            percentChange1Hr.push(percent_change_1h)
            percentChange24Hr.push(percent_change_24h)
            percentChange7d.push(percent_change_7d)
            }
           
       
       } catch(error) {
         console.log('Error happened here!')
         console.error(error)
       }
       res.render("home",{cryptoList:crName,price:crPrice,oneHr:percentChange1Hr,twentyFourHr:percentChange24Hr,
        sevenDays:percentChange7d, rank:crRank})
      })

 


    
    
   
 })

 app.get("/newEntry", function(req,res){

  res.render("newEntry",{cryptoList:crName})
 })

app.listen("3000",function(){
    console.log("server is running...")
})

//d9477a9a-2fb6-48cf-9b30-73f3916b5eb7
//'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=10c&convert=USD
//https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&CMC_PRO_API_KEY=d9477a9a-2fb6-48cf-9b30-73f3916b5eb7&limit=1&convert=BUSD
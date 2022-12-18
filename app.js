const express = require("express");
const bodyParser = require("body-parser");
const func = require(__dirname + "/fetchApi.js")
const https = require('https');
const { response } = require("express");
const app = express();
app.use(express.static("public"))
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

const start = 1
const limit = 100
const convert = "USD"
const apiKey = "d9477a9a-2fb6-48cf-9b30-73f3916b5eb7"
const url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=" + start + "&limit=" + limit + "&convert=" + convert + "&CMC_PRO_API_KEY=" + apiKey

const apiData = []
const entry = []
const fav =[]


app.get("/", function (req, res) {

  function data() {
//Truncate the Array to reload new Data
    apiData.splice(0, apiData.length)

    // get the Data from API source
    fetch(url).then(async function (response) {
      try {
        const data = await response.json()
        for (let i = 0; i < limit; i++) {

          const cryptoId = data.data[i].id
          const logo = "https://s2.coinmarketcap.com/static/img/coins/64x64/" + cryptoId + ".png"

          // create JSON Object includes Api Data
          const apidata = {
            rank: data.data[i].cmc_rank,
            cryptoName: data.data[i].name,
            symbole: data.data[i].symbol,
            cryptoPrice: func.currency(data.data[i].quote.USD.price),
            percent_change_1h: func.percent(data.data[i].quote.USD.percent_change_1h),
            percent_change_24h: func.percent(data.data[i].quote.USD.percent_change_24h),
            percent_change_7d: func.percent(data.data[i].quote.USD.percent_change_7d),
            cryptoId: cryptoId,
            logo: logo
          };
         

          // Add all JSON objects in an Array
          apiData.push(apidata)
        }

        res.render("home", { apiDatas: apiData })

      } catch (error) {
        console.log('Error happened here!')
        console.error(error)
      }

    })


  }
  data()




})

app.get("/newEntry", function (req, res) {
 
  res.render("newEntry", { apiDatas: apiData })
})

app.post("/newEntry", function (req, res) {
  const newEntry = {
    id: func.idIncrement(entry),
    date: req.body.date,
    side: req.body.side,
    name: req.body.cryptoList,
    quantity: func.longNumber(req.body.quantity),
    price: func.currency(req.body.cost)
  };


  entry.push(newEntry)
  res.redirect("/dashboard")


})

app.get("/dashboard", function (req, res) {

  const date = entry.date;
  const cryptoName = entry.name;
  const quantity = entry.quantity;
  const price = entry.price;

  res.render("dashboard", {  newEntries: entry })
})

app.listen("3000", function () {
  console.log("server is running...")
})

//d9477a9a-2fb6-48cf-9b30-73f3916b5eb7
//'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=10c&convert=USD
//https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&CMC_PRO_API_KEY=d9477a9a-2fb6-48cf-9b30-73f3916b5eb7&limit=1&convert=BUSD
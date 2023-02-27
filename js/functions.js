exports.currency = function (num) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'USD',
    maximumSignificantDigits: 4,
  }).format(num);
}

exports.percent = function (num) {
  return new Intl.NumberFormat('default', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,

  }).format(num / 100);

}

exports.longNumber = function (num) {
  return new Intl.NumberFormat('de-DE', {
    maximumSignificantDigits: 10
  }).format(num);
}

exports.shortNumber = function (num) {
  return new Intl.NumberFormat('de-DE', {
    maximumSignificantDigits: 3
  }).format(num);
}

exports.idIncrement = function (array) {
  let counter = 1;
  while (counter <= array.length) {
    counter++;
  }
  return counter


}


exports.idIncrement = function () {
  let counter = 1;
  while (counter > 0) {
    counter++;
  }
  return counter


}

// fetch Api function
exports.getApi = async function (callback){
  const start = 1
    const limit = 2000
    const convert = "USD"
    const apiKey = process.env.API_KEY2
    const url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=" + start + "&limit=" + limit + "&convert=" + convert + "&CMC_PRO_API_KEY=" + apiKey
    
  try{
  let res = await fetch(url)
  let data = await res.json()
 
    return callback(data)
    
  }
  
 
  catch(err) {console.log(err);}
};

// fetch Api function
exports.exchangeInfo = async function (callback){
  
    const url = "https://api.binance.me/api/v3/exchangeInfo"
    
  try{
  let res = await fetch(url)
  let data = await res.json()
 
    return callback(data.symbols)
    
  }
  
 
  catch(err) {console.log(err);}
}




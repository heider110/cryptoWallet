const mongoose = require('mongoose');


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
module.exports = LiveData;
const mongoose = require('mongoose');
const entrySchema = new mongoose.Schema({
    id:Number,
    date: String,
    time: String,
    side: String,
    name: String,
    symbol:String,
    amount:Number,
    buyPricePerCoin: Number,
    buyPriceInTotal: Number,
    currentPricePerCoin: Number,
    currentPriceInTotal: Number,
    profit: Number,
    logo:String
    
   })
  
const userSchema =  new mongoose.Schema({
    username : String,
    fName:String,
    lName:String,
    password : String,
    googleId: String,
    secret: String,
    walletName: String,
    transactions: [entrySchema],
    favouriteList: [{ type:mongoose.Schema.Types.ObjectId, ref: "LiveData"}],
    createsAt: {
      type: Date,
      default: Date.now
    }
   });
   const User = mongoose.model("User", userSchema);
   module.exports = User;
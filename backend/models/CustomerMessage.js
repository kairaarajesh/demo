const mongoose = require('mongoose');

const CustomerMessageSchema = new mongoose.Schema({

    title : {type :String,required: true},
    description : {type :String,required: true},
    image : {type :String },
    phoneNumbers: { type: [String], default: []
    }

}, { timestamps: true });
    
module.exports = mongoose.model('CustomerMessage', CustomerMessageSchema);
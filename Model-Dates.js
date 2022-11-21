var mongoose = require('mongoose');

var DateSchema = new mongoose.Schema({
    name:String,
	LatestDate :Date,
    StartDate :Date
});

module.exports = GoogleDate= mongoose.model('googledate',DateSchema);
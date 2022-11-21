var mongoose = require('mongoose');

var ImageSchema = new mongoose.Schema({
	name: String,
	image:String,
	Date: {
		type: Date,
		//default : Date.now(),
		required: true
		//default:new Date("2022-03-03")
	}
});

module.exports = GoogleDrive = mongoose.model('googledrive', ImageSchema);

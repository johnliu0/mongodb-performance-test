var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var worker = Schema({
    email: String,
    password: String,
    notes: String,
    birthDate: Date,
    emergencyContactName: String,
    emergencyContactNumber: Number,
    rating: Number,
    workedHours: Number,
    agency: String,
    availabilities: [Schema.ObjectId],
    phoneCode: Number,
    phoneNumber: Number,
    firstName: String,
    lastName: String,
    address: {
        line1: String,
        line2: String,
        city: String,
        province: String,
        postalCode: String,
        country: String
    },
    about: String
});

var Worker = mongoose.model('worker', worker);
module.exports = Worker;

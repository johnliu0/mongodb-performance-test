var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var availability = Schema({
    worker: { type: Schema.ObjectId, index: true },
    name: String,
    repeatDays: {
        sunday: { type: Boolean, default: false },
        monday: { type: Boolean, default: true },
        tuesday: { type: Boolean, default: true },
        wednesday: { type: Boolean, default: true },
        thursday: { type: Boolean, default: true },
        friday: { type: Boolean, default: true },
        saturday: { type: Boolean, default: false },
    },
    startTime: {
        hour: Number,
        minute: Number
    },
    endTime: {
        hour: Number,
        minute: Number
    },
});

var Availability = mongoose.model('availability', availability);
module.exports = Availability;

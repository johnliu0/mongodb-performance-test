const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const app = express();
const test = require('./test');

mongoose.Promise = Promise;
mongoose.connect('mongodb://localhost:27017/perftest', { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(jsonParser);

app.get('/test', (req, res) => {
  test.run();
  res.send('running!');
});

app.listen(3005, () => {})

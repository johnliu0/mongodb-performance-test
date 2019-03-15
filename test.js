const mongoose = require('mongoose');
const utils = require('./utils');
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: 'data.log' })
  ]
});

const Worker = require('./worker');
const Availability = require('./availability');

/**
 * Initial testing variables
 *
 * You may modify these as you wish.
 *
 * Quick rundown on the availability chance:
 * Simply put, on each test set, there is a chance that a randomly generated worker could be
 * selected to be given at least one availability. That variable will begin with availChanceStart
 * and increment up to availChanceEnd. This lets us simulate how a real database might function;
 * since we will initially begin with a large amount of workers in the system, but have few workers
 * that actually have taken the time to fill out their availabilities. Over time, more and more
 * workers will however, eventually fill it out.
 */
// number of worker documents in database
let numWorkers = 5000;
// minimum number of availibilities that a worker can have
let availLow = 1;
// maximum number of availibilities that a worker can have
let availHigh = 3;
// what availability chance to start the entire test on
let availChanceStart = 0.05;
// what availability chance to end the entire test at
let availChanceEnd = 0.60;
// how much to increment the availability chance per test set
let availChanceIncrement = 0.05;



/**
 * Some variables used during testing.
 *
 * These variables are simply being used internally for the testing. Don't modify these!
 */

// number of availability documents in database
let numAvails = 0;
// chance that a worker will have at least one availability
let availChance = 0;
// number of workers that contain at least one availability
let numWorkersWithAvails = 0;
// the ids of workers that will be queried
let randomWorkerIds = [];

/**
 * Runs the testing library.
 */
const run = async () => {
  console.log('\n------------------------------------------------------------');
  console.log('Started MongoDB querying analytics!');
  console.log('Sponsored by: Timesaved');
  console.log('Test set variables:');
  console.log(`Number of workers: ${numWorkers}`);
  console.log(`Minimium number of availabilities per selected worker: ${availLow}`);
  console.log(`Maximum number of availabilities per selected worker: ${availHigh}`);
  console.log(`Beginning with an availability chance of: ${availChanceStart}`);
  console.log(`Ending with an availability chance of: ${availChanceEnd}`);
  console.log(`Incrementing availability per test set by: ${availChanceIncrement}`);
  console.log('------------------------------------------------------------\n');

  let startTime = new Date().getTime();

  for (let i = availChanceStart; i <= availChanceEnd; i += availChanceIncrement) {
    console.log(`--------------- Test Set ${Math.round(i / availChanceStart)} ---------------`);
    availChance = i;
    console.log(`Chance for a worker to have at least one availability: ${Math.round(availChance * 1000) / 1000}`);
    await clearAllData();
    await generateData();
    await runTestSet();
  }

  console.log('\n------------------------------------------------------------');
  console.log(`Done querying! Took ${Math.floor((new Date().getTime() - startTime) * 100) / 100}ms.`);
  console.log('Results have been saved to data.log in the directory that this tool was run.');
  console.log('Thanks for using my MongoDB querying analytics tool!');
  console.log('My Github: https://github.com/johnliu4');
  console.log('------------------------------------------------------------\n');

  return;
};

const runTestSet = async () => {
  // scramble the worker ids to test so that the querying is random (mitigate possible effects of caching)
  utils.scrambleArray(randomWorkerIds);
  console.log('Number of availabilities in database: ' + numAvails);
  console.log('Number of workers with at least one availability: ' + numWorkersWithAvails);
  console.log('Beginning querying...');
  let testStartTime = new Date().getTime();

  let avgWorkerFindTime = await testWorkerFindById();
  let avgWorkerFindThenAvailFindTime = await testWorkerFindByIdThenAvailFind();
  let avgAvailFindTime = await testAvailFindByWorkerId();

  logger.log({
    level: 'info',
    message:
      `workers: ${numWorkers} | ` +
      `availabilities: ${numAvails} | ` +
      `workers with availabilities: ${numWorkersWithAvails} | ` +
      `Worker.findById avg: ${avgWorkerFindTime}ms | ` +
      `Worker.findById then Availability.find with $in avg: ${avgWorkerFindThenAvailFindTime} | ` +
      `Availability.find by worker id avg: ${avgAvailFindTime}ms`
  });

  await console.log(`Done testing! Took ${Math.floor((new Date().getTime() - testStartTime) * 100) / 100}ms.`);
};

/**
 * Finds a Worker by id.
 *
 * This simulates a Worker that simply embeds the availability information.
 */
const testWorkerFindById = async () => {
  let workerTimeSum = 0;

  for (let i = 0; i < randomWorkerIds.length; i++) {
    let startTime = new Date().getTime();
    await new Promise(resolve => {
      Worker.findById(randomWorkerIds[i], (err, worker) => {
        workerTimeSum += new Date().getTime() - startTime;
        resolve();
      });
    });
  }

  const avgTime = Math.floor(workerTimeSum / randomWorkerIds.length * 100) / 100;
  console.log(`Average Worker.findById query: ${avgTime}ms`);
  return avgTime;
};

/**
 * Finds a Worker by id, then searches for the availabilities by their ids.
 *
 * This simulates a Worker with an availability array that contains only ObjectId references.
 */
const testWorkerFindByIdThenAvailFind = async () => {
  let workerTimeSum = 0;

  for (let i = 0; i < randomWorkerIds.length; i++) {
    let startTime = new Date().getTime();
    await new Promise(resolve => {
      Worker.findById(randomWorkerIds[i], (err, worker) => {
        Availability.find({ _id: { $in: worker.availabilities }}, (err, avails) => {
          workerTimeSum += new Date().getTime() - startTime;
          resolve();
        });
      });
    });
  }

  const avgTime = Math.floor(workerTimeSum / randomWorkerIds.length * 100) / 100;
  console.log(`Average Worker.findById then Availability.find query: ${avgTime}ms`);
  return avgTime;
};

/**
 * Finds all the availabilities that are associated with a worker id.
 *
 * This simulates a Worker that contains no references to availabilities.
 * Instead, the availability document itself contains a reference to the worker.
 */
const testAvailFindByWorkerId = async () => {
  let availTimeSum = 0;

  for (let i = 0; i < randomWorkerIds.length; i++) {
    let startTime = new Date().getTime();
    await Availability.find({ worker: randomWorkerIds[i] }, (err, avails) => {
      availTimeSum += new Date().getTime() - startTime;
      return;
    });
  }

  let avgTime = Math.floor(availTimeSum / randomWorkerIds.length * 100) / 100;
  console.log(`Average Availability.find by worker id query: ${avgTime}ms`);
  return avgTime;
};

const generateData = () => new Promise(resolve => {
  console.log('Beginning generating data...');

  let generateStartTime = new Date().getTime();
  let randomWorkerData = [];
  randomWorkerIds = [];
  for (let i = 0; i < numWorkers; i++) {
    randomWorkerData.push(generateRandomWorkerData());
  }

  // first insert the bulk of the randomly generated data into the database
  Worker.collection.insertMany(randomWorkerData, (err, workers) => {
    // array of promises
    let proms = [];

    for (let i = 0; i < numWorkers; i++) {
      // then randomly select workers to give availabilities to
      if (Math.random() < availChance) {
        proms.push(new Promise(resolve => {
          let num = utils.randomInt(availLow, availHigh, true);
          numAvails += num;
          numWorkersWithAvails++;
          let id = workers.insertedIds[i]._id;
          randomWorkerIds.push(id);

          // generate some availability data
          let availsData = [];
          for (let j = 0; j < num; j++) {
            availsData.push({ ...generateRandomAvailabilityData(), worker: id });
          }

          // now two things need to happen
          // the availabilities need to be inserted into the availability collection
          // and once that is finished, those availability ids need to be
          // put into the worker availabilities array of re
          Promise.all([
            new Promise((resolve) => {
              Availability.collection.insertMany(availsData, (err, avails) => {
                resolve(avails.insertedIds);
              });
            }),
            new Promise((resolve) => {
              Worker.findById(id, (err, worker) => {
                resolve(worker);
              });
            })
          ]).then(values => {
              let worker = values[1];

              for (let j = 0; j < availsData.length; j++) {
                worker.availabilities.push(values[0][j]);
              }

              worker.save(err => {
                resolve();
              });
            });
        }));
      }
    }

    Promise.all(proms)
      .then(() => {
        console.log(`Done generating workers! Took ${Math.floor((new Date().getTime() - generateStartTime) * 100) / 100}ms.`);
        resolve();
      });

  });
});

const clearAllData = () => new Promise(resolve => {
  // dropping a collection that doesn't yet exist will return an error
  Worker.collection.drop().catch(err => {});
  Availability.collection.drop().catch(err => {});

  numAvails = 0;
  numWorkersWithAvails = 0;
  randomWorkerIds = [];

  resolve();
});

const generateRandomWorkerData = () => {
  const worker = {};
  worker.email = `${utils.randomAlphaNumeric(12)}@${utils.randomWord(6)}.com`;
  worker.password = `${utils.randomWord(14)}`;
  worker.notes = utils.randomParagraph(utils.randomInt(3, 20));
  worker.birthDate = new Date(utils.randomInt(0, 1000000000000));
  worker.emergencyContactName = utils.randomWord(6);
  worker.emergencyContactNumber = utils.randomPhoneNumber();
  worker.rating = Math.random() * 5;
  worker.workedHours = Math.random() * 100;
  worker.agency = utils.randomAlphaNumeric(24);
  worker.phoneCode = 1;
  worker.phoneNumber = utils.randomPhoneNumber();
  worker.firstName = utils.randomWord(3, 7);
  worker.lastName = utils.randomWord(3, 7);
  worker.about = utils.randomParagraph(utils.randomInt(3, 20));

  worker.address = {
    line1: utils.randomWord(3, 7),
    line2: utils.randomWord(3, 7),
    city: utils.randomWord(3, 7),
    province: utils.randomWord(3, 6),
    postalCode: utils.randomAlphaNumeric(6),
    country: utils.randomWord(3, 6)
  };

  return worker;
};

const generateRandomAvailabilityData = workerId => {
  let avail = {};
  avail.name = utils.randomWord(3, 10);

  avail.repeatDays = {
    sunday: Math.random() > 0.5,
    monday: Math.random() > 0.5,
    tuesday: Math.random() > 0.5,
    wednesday: Math.random() > 0.5,
    thursday: Math.random() > 0.5,
    friday: Math.random() > 0.5,
    saturday: Math.random() > 0.5,
  };

  avail.startTime = {
    hour: utils.randomInt(0, 23),
    minute: utils.randomInt(0, 59)
  };

  avail.endTime = {
    hour: utils.randomInt(0, 23),
    minute: utils.randomInt(0, 59)
  };

  return avail;
};

module.exports = { run };

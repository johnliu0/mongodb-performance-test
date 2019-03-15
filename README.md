# Some ghetto benchmarking for MongoDB querying performance

Had a lengthy discussion with some colleagues at my job on how to go about handling this one MongoDB model. I claimed that either embedding the subdocument within the main document or simply referencing the subdocument *through* the main document was more than sufficient. I noted that due to the ObjectId's naturally sorted nature given it embeds a UNIX timestamp within the id; the `findById` would be much more efficient. I presume that internally, there is some binary search implemented to quickly find by id.

This querying optimization analysis essentially looks at the read performance of the three main types of document relationship, and how they might be stored within the database:
1. **One-to-few**: embedding the 'few' within the 'one'
2. **One-to-many**: putting the 'many' into its own collection and having the 'one' keep an array of references to the 'many'
3. **One-to-squillions**: putting the 'squillions' into its own collection, each one with a reference to the 'one'; this implies that the 'one' itself has no references to the 'squillions'

## Conclusion
**tl;dr** A single `findById` is indisputably faster than any other query. If you have few subdocuments that you wish to store within a main document, then consider using either one of the two first approaches that I list above; **one-to-few** or **one-to-many**.

The **one-to-squillions** method really only should be used if there are enough subdocuments that listing every reference from the main document would cause the document to exceed its 16 MB max size.

My guess is that the `findById` leverages the logarithmically fast binary search to quickly find an object, since object ids are *naturally sorted and unique* (the id actually contains a UNIX timestamp).

## Notes
If you decide to run the tests yourself, then know that:
- this benchmark will connect to mongodb://localhost:27017/perftest.
- the server runs on localhost:3005

## How the testing works
The entire testing is carried out in multiple test sets.

In the first test set, 5000 workers will be randomly generated. After generation, random availabilities will be assigned to random workers. There is a 5% chance that a worker will be selected to be given at least one availability. Of that 5%, they will be randomly given 1-3 availabilities.

Three query methods are tested; these three query methods respond to three different ways we could be storing these models in our database.

1. **One-to-few** approach. The first method (which I suggest; but the second method works as well) treats the Worker as if the Availability models were directly embedded into the Worker. Therefore, only a singular query is needed, and that is `Worker.findById`.
2. **One-to-many** approach. The second method puts the Availability models into their own collection, and has the Worker keep an array of Availability references. Therefore, to get the availabilities, first a `Worker.findById` query is issued to find the worker. Then, the availabilities are found by `Availability.find({ _id: { $in: worker.availabilities }})`. The key here is the **$in** aggregation operator here. Internally, MongoDB is likely performing some querying that's similar to `findById`.
3. **One-to-squillions** approach. The third method puts the Availability models into their own collection. An availability will reference a Worker. The Worker itself will have no knowledge of the availability.

Reads are performed in sequential order (using a ton of async/await and Promises). This is needed since Node's single-threaded behavior would otherwise give us unreliable timings of how long queries took. In other words, in the testing, the next query is only performed when the previous query is finished.

After this first test set is complete, the entire database is wiped and any counters being used internally are reset. The chance of receiving an availability is then increased to 10%. That would be the next test set. This process repeats until a chance for availability of 60% is reached.

Within the data.log file, you will see 6 variables per test set.

`workers` corresponds to the number of worker documents in the database.

`availabilities` corresponds to the number of availability documents in the database.

`workers with availabilities` corresponds to the number of workers with *at least one* availability document that references them

`Worker.findById avg` corresponds to the average read time for the **one-to-few** approach

`Worker.findById then Availability.find with $in avg` corresponds to the average read time for the **one-to-many** approach

`Availability.find by worker id avg` corresponds to the average read time for the **one-to-squillions** approach



## Performing your own tests

Simply open up utils.js and change any of the 'Initial testing variables'. You can modify the number of workers, the availability chances, or how many availabilities one worker could potentailly have.

Once the variables are how you want them to be, run index.js using node. Head to your browser and put in localhost:3005/test to begin the testing. Your console will then begin outputting some data. Summarized data will be put into a data.log file located in the same directory of the server.

## Results

Here's some example data from a test that was run with the default settings.

```
{"level":"info","message":"workers: 5000 | availabilities: 498 | workers with availabilities: 256 | Worker.findById avg: 0.76ms | Worker.findById then Availability.find with $in avg: 1.49 | Availability.find by worker id avg: 1.02ms","service":"user-service"}
{"level":"info","message":"workers: 5000 | availabilities: 931 | workers with availabilities: 465 | Worker.findById avg: 0.57ms | Worker.findById then Availability.find with $in avg: 1.16 | Availability.find by worker id avg: 1.36ms","service":"user-service"}
{"level":"info","message":"workers: 5000 | availabilities: 1502 | workers with availabilities: 761 | Worker.findById avg: 0.44ms | Worker.findById then Availability.find with $in avg: 1.01 | Availability.find by worker id avg: 1.53ms","service":"user-service"}
{"level":"info","message":"workers: 5000 | availabilities: 1957 | workers with availabilities: 988 | Worker.findById avg: 0.41ms | Worker.findById then Availability.find with $in avg: 1 | Availability.find by worker id avg: 1.81ms","service":"user-service"}
{"level":"info","message":"workers: 5000 | availabilities: 2386 | workers with availabilities: 1193 | Worker.findById avg: 0.42ms | Worker.findById then Availability.find with $in avg: 0.96 | Availability.find by worker id avg: 2.07ms","service":"user-service"}
{"level":"info","message":"workers: 5000 | availabilities: 2907 | workers with availabilities: 1456 | Worker.findById avg: 0.39ms | Worker.findById then Availability.find with $in avg: 0.96 | Availability.find by worker id avg: 2.27ms","service":"user-service"}
{"level":"info","message":"workers: 5000 | availabilities: 3518 | workers with availabilities: 1751 | Worker.findById avg: 0.38ms | Worker.findById then Availability.find with $in avg: 0.98 | Availability.find by worker id avg: 2.57ms","service":"user-service"}
{"level":"info","message":"workers: 5000 | availabilities: 4066 | workers with availabilities: 2026 | Worker.findById avg: 0.39ms | Worker.findById then Availability.find with $in avg: 0.93 | Availability.find by worker id avg: 2.79ms","service":"user-service"}
{"level":"info","message":"workers: 5000 | availabilities: 4566 | workers with availabilities: 2291 | Worker.findById avg: 0.37ms | Worker.findById then Availability.find with $in avg: 0.93 | Availability.find by worker id avg: 3.26ms","service":"user-service"}
{"level":"info","message":"workers: 5000 | availabilities: 4974 | workers with availabilities: 2504 | Worker.findById avg: 0.41ms | Worker.findById then Availability.find with $in avg: 0.99 | Availability.find by worker id avg: 3.47ms","service":"user-service"}
{"level":"info","message":"workers: 5000 | availabilities: 5348 | workers with availabilities: 2674 | Worker.findById avg: 0.39ms | Worker.findById then Availability.find with $in avg: 0.95 | Availability.find by worker id avg: 3.33ms","service":"user-service"}
{"level":"info","message":"workers: 5000 | availabilities: 5866 | workers with availabilities: 2976 | Worker.findById avg: 0.39ms | Worker.findById then Availability.find with $in avg: 1 | Availability.find by worker id avg: 3.75ms","service":"user-service"}
```

Clearly the `findById` outperforms here. In fact it got better when there were more workers to be queried. My guess is that there is some sort of internal caching going on to help optimize for the `findById` as it's used more and more. Likely the `findById` is using some binary search implementation; that's probably why there's such a large difference in the speed compared to the other methods.

On the other hand, searching for the Availabilities by worker id gets slower and slower. This makes sense since MongoDB has to search for data that could be repeated (there could be multiple availabilities that link to the same worker); and this data is not sorted as an id is. That would give reason to the slower performance since MongoDB has to linearly search through the entire collection to find all availabilities that link to one worker (generally speaking; obviously there are some internal algorithms that help to speed up this process).

Lastly, for the findById followed by the $in aggregation operator, its results are also to be expected. Since we are searching by strictly unique ids, the binary search can still be used. That would explain the consistent performance. There is probably some very ingenious code within MongoDB that allows for efficient querying of multiple ids based on the ordinary binary search. Kudos to those MongoDB engineers!

## What the random data looks like

Worker document:
```
{
	"_id" : ObjectId("5c8be3f6d8fc3320c497878b"),
	"email" : "6c3Km8JJ9FQh@pVQbbf.com",
	"password" : "DvRkFnnMUJTdOT",
	"notes" : "xejL RJZH WyNKCMeWu yZwk",
	"birthDate" : ISODate("1979-01-22T07:29:51.164Z"),
	"emergencyContactName" : "eSxIXb",
	"emergencyContactNumber" : 6089351044,
	"rating" : 4.038579229096698,
	"workedHours" : 53.79407792427595,
	"agency" : "ah63I56554Ym05x297xw3DU4",
	"phoneCode" : 1,
	"phoneNumber" : 9920489270,
	"firstName" : "gpS",
	"lastName" : "NzYic",
	"about" : "uxFaQebV ZWn ebHHjF qTDRf gKaeKCmAP MPQzVIHTO qczszEYd Vfrco fJFNGB uGxa rKr",
	"address" : {
		"line1" : "dhw",
		"line2" : "gJaUa",
		"city" : "tgX",
		"province" : "Iuj",
		"postalCode" : "8v8v31",
		"country" : "jWdp"
	},
	"__v" : 1,
	"availabilities" : [
		ObjectId("5c8be3f6d8fc3320c4979b13"),
		ObjectId("5c8be3f6d8fc3320c4979b14"),
		ObjectId("5c8be3f6d8fc3320c4979b15")
	]
}
```

Availability document:
```
{
	"_id" : ObjectId("5c8be3f6d8fc3320c4979b16"),
	"name" : "QlGvQbCSU",
	"repeatDays" : {
		"sunday" : true,
		"monday" : false,
		"tuesday" : false,
		"wednesday" : false,
		"thursday" : true,
		"friday" : false,
		"saturday" : false
	},
	"startTime" : {
		"hour" : 2,
		"minute" : 12
	},
	"endTime" : {
		"hour" : 1,
		"minute" : 13
	},
	"worker" : ObjectId("5c8be3f6d8fc3320c497878d")
}
```

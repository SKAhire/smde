### Question 2 — Queue Choice

After considering the pros and cons of BullMQ, pg-boss and "naive" polling queues, we decided to go with BullMQ.

Reason:

For polling queues, even thought it don't need any external dependencies and will is a good option, but we have to configure the queue and the worker which when combining with slight latency it is not design for massive throughput like 500+ concurrent jobs per minute.

For pg-boss, it covers most of the issues that we face like built-in retry, scheduling, concurrency control, SKIP LOCKED handled for you, It is completely dependent on the postgres so with 500+ jobs per minute putting real load on Postgres while it's also handling API reads/writes.

Where in case with BullMQ we only have to configure our docker file to handle postgres and Radis to run the Redis. But it takes all the load from our db and also handles most of the issues we face with pg-boss and polling queues.

### Question 4 — Schema Design

#### Table structure

##### Sessions Table

- Creates a session when for candidate to keep all the documents uploaded for the candidates in one session.
- detectedRole is null until the first document is processed, then using applicableRole it is updated.

##### Extractions Table

- Every uploaded document becomes one extraction record.
- Columns like documentType, isExpired, expiryDate, fitnessResult are things we want to filter or query on.
- Columns like fieldsJson, flagsJson, medicalJson are display data only.

##### Jobs Table

- Jobs table is both a job tracker and for queue.

##### Validations Table

- Every time a document is processed, it is validated against the rules and the results are stored here.

#### The suggested schema uses JSONB/TEXT columns for dynamic fields. What are the risks of that approach at scale?

The core risk is that JSON columns in Postgres are opaque to the query planner. You cannot index inside them without explicit GIN indexes, and even then there is a risk of query syntax errors like typos, scaning complete tables to find right column or won't work if json format changes.

So, to fix that we have created column such as documentType, isExpired, expiryDate, etc. So we can index them and query them.

#### What would you change if this system needed to support full-text search across extracted field values, or querying "all sessions where any document has an expired COC"?

For full-text search, we have 2 options use GIN indexes but it only returns exacts matches so if the format changes it won't work.

And our second option is to create a new table which will have keys and values so the "all sessions where any document has an expired COC" query can be done.

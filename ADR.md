### Question 0 - Tech Stack and Design Choices

We are using NodeJS with Typescript, Express, Postgres, Prisma, Redis, BullMQ, and Docker for Postgres and Redis. For the LLM we are using Gemini, Groq, Anthropic. We have created provider for each llm so we can change the provider by changing the env variables. 

We are using Feature-based/Module-based architecture instead of Layer-based architecture. Because it is something i have been trying with my projects and i found that code management is way easier with Feature-based/Module-based architecture. So choose this structure is a personal choice. But if i was working with a team, I would prioritize dicussing this with the team and see if they are ok with it.

Most of the things about the dicussions i made are covered below. But there are a few things that i would like to mention here. For example, we are using a library called express-rate-limit to limit the number of requests we can make to the api the apis are /api/extract and /api/sessions/:sessionId/validate. Both of these are making calls to our llm. The reason we are using express-rate-limit intead of using 

### Question 1 — Sync vs Async

Well even though it was fun to build a api which supports both sync and async, for production using sync is not a good idea in almost all cases. Because sync mode blocks the HTTP connection for the entire duration of the api call so until we get the response from the llm, so if 20 users upload at a time they will have to wait till the llm responses to the requests before them. Also under enough load this exhausts the connection pool and new requests start timing out before they're even processed. If i had to say, i can only think using sync in one scenario which is we only have one user and they are uploading only one document at a time.

That being said we are using sync as default if the file size is less than 100KB. And we are using async if the file size is greater than 100KB or if the user requests async mode.


### Question 2 — Queue Choice

After considering the pros and cons of BullMQ, pg-boss and "naive" polling queues, we decided to go with BullMQ.

Reason:

For polling queues, even thought it don't need any external dependencies and will is a good option, but we have to configure the queue and the worker which when combining with slight latency it is not design for massive throughput like 500+ concurrent jobs per minute.

For pg-boss, it covers most of the issues that we face like built-in retry, scheduling, concurrency control, SKIP LOCKED handled for you, It is completely dependent on the postgres so with 500+ jobs per minute putting real load on Postgres while it's also handling API reads/writes.

Where in case with BullMQ we only have to configure our docker file to handle postgres and Radis to run the Redis. But it takes all the load from our db and also handles most of the issues we face with pg-boss and polling queues.

### Question 3 — LLM Provider Abstraction

We are using Swappable LLM providers. We have Gemini, Groq, Anthropic. We can change the provider by changing the env variables. We have created provider for each llm. And all 3 providers take same interface that is `extract(fileBuffer, mimeType, fileName)`. And returns raw string, which using our json util function we extract the object from it.

The factory reads LLM_PROVIDER from env at startup and returns the correct provider based on the env variable. Our service only calls the createLLMProvider().

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



### Question 5 — What You Skipped

**Add a cloud storage**

In my current code, we are storing the files on the server, till we process the file through our llm. And remove it when we are done with it - which mean when if we have to re-check the file we can't do that -. But storing the files on the server will take up space even though it is temporary. So we can use cloud storage like AWS S3 to store the files. And fetch the files whenever we need it, and we don't have to delete the files after we are done with them. 

As for why i have not added cloud storage in our current flow is because i am not sure if we will be needing the files after we are done with the extraction. But if we do need the files, we can add it in the future.

**Adding fail safes for llm provider**

Currently, we are using only one llm, even though we can switch to another llm. If the current llm is down, user will not be able to process the file. So instead of manually changing the llm, we can add fail safes for llm. Which when one llm is down, it will automatically switch to the next llm. 

We can also let the users choose which llm they want to use - Each llm has it's own way for pricing, token and capabilities so letthig user choose which llm they want will be good to have-. 

**Add a logger**

We can add a logger to keep track of the logs. Often times, server crashes or errors happens, which we have to reproduce to fix it. And it gets hard to do that in some cases. So having a logger is really helpful. 

**Manual retry for failed jobs**

We can add a manual retry for failed jobs and prompt versioning as suggested in bonus section. Letting the user retry for failed jobs manually will come in handy. as there be many issues which can cause the job to fail, like timeout, llm timeout, or llm error. So if user can manually retry the job, it will be easier for them.

Prompt versioning is also a good idea. After some research, i found that there are many type of documents which can be uploaded for jobs. So we can have different prompts for different types of documents so the llm can understand the context better.

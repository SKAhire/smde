# Code Review — feat: add document extraction endpoint

**Reviewer:** Senior Backend Engineer  
**PR Author:** Junior Engineer  
**File:** `src/routes/extract.ts`

---

## Overall Assessment

This is a good starting point. The core idea is right, it covers the main flow: receive file, convert to base64, call Claude, return josn. That being said, there are a few thing that would cause issues in the production, and a few serious issues that cause security or compliance violations.

### High Priority Issues

#### 1. Hardcoded API Key

```typescript
const client = new Anthropic({ apiKey: "sk-ant-REDACTED" });
```

This is the most urgent issue in the PR. When using any API key or any secret, it is important not to directly embed it in the code. Instead, use environment variables or a secret manager to store the key. Committing sensitive information to the codebase directly will expose the key to anyone who has access to the codebase.

**Fix/Suggestion:**
The fix for this issue is very simple, we remove the hardcoded key and replace it with an environment variable.

```typescript
const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
// or in our case
const client = new Anthropic({ apiKey: env.LLM_API_KEY });
```

### 2. Saving uploaded files

We have few issues with the way we are handling uploaded files.

**Issue 1: Not validating the file type**

```typescript
const file = req.file;

if (!file) {
  res.status(400).json({ error: "No file uploaded" });
  return;
}
```

Currently, we are just checking if the file is present. But we have to validate the file type before we can process it - and always check the file MIME type instead of checking the file extension -. We check MIME type and not extension because if a user uploads a file with a .js.pdf extension, a extension check will be treat it as a PDF file, but the MIME type will be application/javascript. So we need to check the MIME type instead of the extension.

**Fix/Suggestion:**
We add restrictions to the file type - like we will only accept JPG, PNG, OR PDF file type -.

**Issue 2: Not changing the file name**

```typescript
// Read the file and convert to base64
const fileData = fs.readFileSync(file.path);
const base64Data = fileData.toString("base64");

// Save file to disk permanently for reference
const savedPath = path.join("./uploads", file.originalname);
fs.copyFileSync(file.path, savedPath);
```

The issue here is that we are not changing the file name. This alone won't be a big problem, but combining this with issue 1 can cause serious security issues such as Remote Code Execution - the attacker can execute code on your server - or Path Traversal - where a attacker can travers through our server, e.g: ../../../../etc/passwd -. We can also face issues like overwriting files or deleting files with same names.

**Fix/Suggestion:**
We need to change the file name before we save it - i recommend adding current timestamp to the file name -.

### 3. LLM prompt is not secure

```typescript
 type: 'text',
 text: 'Extract all information from this maritime document and return as JSON.',
```

This can also be a problem. The prompt used here is too vague, and can cause security issues. The is a security issue called prompt injection, where an attacker can inject malicious code into the prompt. In our case, they can inject the prompt through the uploaded file. And our ai will execute is, our cause our llm is not connected to any sensitive data, but in many cases, it has access to sensitive data. Which can cause serious security issues. Also with this prompt, the response format won't be consistent, and it will make our further processing harder.

**Fix/Suggestion:**
I recommend using a strctured prompt, which will contain LLMs role, how they will process the document, a structure of response we want to get, and what parts the llm is ristricted and cant do.

#### 4. Storing response in globle disk

```typescript
global.extractions = global.extractions || [];
global.extractions.push(result);
```

**Issue 1: Data lost after server restart**
Currently, this logic stores the data on our server in global disk. But if the server is restarted or crashes all the extraction data will be lost.

**Issue 2: Memory leak**

The extraction data is stored in array and as the array grows, the memory usage will increase which will cause memory leak.

**Fix/Suggestion:**
We need to store the extraction data in database. I suggest storing the parameters which are needed to store in separate columns so we can index them and query them.

### Low Priority Issues

#### 1. The code structure

Currently, everything is in one file, which works with small code, but i would still suggest to split the code into different files. This will make it easier to maintain and test.

**Fix/Suggestion:**
A common practice is to use layer based structure, like a controller, service, and routes. Controllers handles requests, services handles business logic, and routes handles the request and response and also the llm provider logic will be in different file because we are using llm in 2 cases extact and validate, so its better to have a sperate file and call that instead of rewirting it everytime. In many cases developer also use respository pattern to handle database operations - We are using this in our case -. In our case, we are using module/feature based structure. Where all the files related to a feature are in the same folder.

#### 2. Only works with one llm

Currently, you are relaing on Anthropic to extract the data, but if antropic is down, it will completely stop our user from extracting the data.

**Fix/Suggestion:**
Keep the llm provider logic in different file and add options to switch to other llm provider if the current one is down.

#### 3. Response is not handled/validated

```typescript
const result = JSON.parse(response.content[0].text);
```

Currently, we are not handling the response from llm, and we are not validating the response. In most cases, the response will not be a valid json, often the llm response with markdown or text - something like "Here is the result for..." -

**Fix/Suggestion:**
We need to handle the response from llm and validate it. We can do that with extracting the JSON from the raw response (find the outermost { and })

#### 4. No size limit

There is no size limit for the file upload. If the user uploads a file which is of 500mb, the extraction will fail. We have to return with an message before the file reaches to the extraction endpoint.

**Fix/Suggestion:**
We need to add a size limit to the file upload. We can use a middleware to check the file size before the extraction endpoint.

#### 5. Storing file on disk

The uploaded files are stored on disk directly and we are not stroing anything related to the file, so there is no way we know which file is which. Also servers provide limited storage and it cost extra to add more storage, and if we decide to change our server, we will have to manually move the files to new server.

**Fix/Suggestion:**
Instead of storing the files on server, we can use cloud storage like AWS S3. And call the data whenever we need it. And it won't affect our main server.


Keeping issues aside, the flow which we are trying to achieve is correct: converting flie to base64, and sending to the Anthropic SDK is correct. The multipart form handling with multer is set up properly. Just needs hardening around credentials, error handling, storage, and reliability before it's anywhere near production.
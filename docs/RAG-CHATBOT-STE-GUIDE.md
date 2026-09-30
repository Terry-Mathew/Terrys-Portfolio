# The Chat Assistant and Push Notifications: A Beginner's Guide

This document explains the chat assistant on this website. It explains the RAG system, the
push notifications, the errors we made, and the decisions we made. It also explains what to
do better next time.

This document uses Simplified Technical English. Sentences are short. Each sentence has one
idea. The words are simple.

---

## Table of contents

1. [What the chat assistant does](#1-what-the-chat-assistant-does)
2. [The parts of the system](#2-the-parts-of-the-system)
3. [How a question gets an answer](#3-how-a-question-gets-an-answer)
4. [What each part costs](#4-what-each-part-costs)
5. [One-time work and daily work](#5-one-time-work-and-daily-work)
6. [Push notifications](#6-push-notifications)
7. [Decisions we made](#7-decisions-we-made)
8. [Errors we made](#8-errors-we-made)
9. [How to work better next time](#9-how-to-work-better-next-time)
10. [Commands you must know](#10-commands-you-must-know)
11. [Words used in this document](#11-words-used-in-this-document)

---

## 1. What the chat assistant does

A visitor opens the chat. The visitor asks a question. The system answers the question in
Terry's voice.

The assistant can also do two other jobs. It can store a visitor's name, email address, or
phone number. Then it can send a push notification to Terry's phone.

The assistant does not book meetings. The assistant does not send email. The assistant only
sends a push notification to one phone.

The assistant uses your own words about yourself. It does not make facts. A rule stops the
assistant from inventing an email address. This rule is described in section 6.

---

## 2. The parts of the system

The system has seven main parts. Each part has one job.

### 2.1 The knowledge files

The knowledge files are text files. They are in this address:

```
src/content/knowledge/
```

These files contain the facts about you. They are the only source of truth. Other parts of
the system read these files. They do not contain the same facts.

Example: `experiments.md` describes your four projects. `skills.md` describes your tools.
`contact.md` contains your email address and your social links.

**Important:** If you change a fact in a knowledge file, the chat assistant does not know
yet. You must run the load command. This command is described in section 2.3.

### 2.2 The vector store

A vector store is a search engine for meaning. Cloudflare calls this service **Vectorize**.

The system reads each knowledge file. Then the system cuts the file into small parts. Each
part is about 900 characters. Then the system changes each part into a list of numbers. This
list is called a **vector**. The list has 768 numbers in it.

Example: the system reads this sentence from `experiments.md`.

```
Settle is a personal finance decision simulator.
```

The system changes it into a list of numbers. The list looks like this.

```
[0.021, -0.114, 0.887, ... 768 numbers in total]
```

The system cannot read these numbers. A person cannot read these numbers. A computer compares
the numbers. Two parts with similar meaning have similar numbers.

This is how the system finds a part when your words do not match the file. If you ask about
"loan repayments", the system finds the part about "debt" and "EMIs". The words are
different. The meaning is the same.

**Important:** the system stores the words of each part next to its vector. When the search
finds a part, the system sends the words of that part to the AI service. The system does not
send the whole file.

**Important:** the system must not send a whole file. A file has parts that do not match the
question. Those parts waste the space in the prompt. The system sent whole files for a long
time. The search found the right part. Then the system threw the part away and sent the whole
file instead. The order of results was correct. The text sent to the AI service was wrong.

### 2.3 The load command

The load command sends your knowledge files into the vector store. The command name is
`ingest`.

The command does four jobs. It reads the files. It cuts the files into parts. It makes a
vector for each part. Then it saves the vectors and the text into the search systems.

**You must run this command each time you change a knowledge file.**

The command uses the web address below.

```
POST https://terrymathew.com/api/ingest
```

The command needs a key. The key is in the secret key storage. The section 10 explains the
command.

**Important:** the command also removes old data. If you delete a knowledge file, the command
removes that file from the search systems. If you make a file shorter, the command removes
the parts that no longer exist.

**This was broken for a long time.** The command only added and changed data. It never removed
anything. A deleted file stayed in the search systems. A file that became shorter kept its
extra parts. The chatbot could answer from a file that was no longer on the site. The command
now removes this data and reports the count.

### 2.4 The order of the work

You must follow this order each time you change a knowledge file.

```
1. Change the knowledge file
2. Send the change to GitHub
3. Wait for the build and the deploy
4. Run the ingest command
```

**Why step 3 must come before step 4.** The build copies the knowledge files into the program.
The program on the server has the old files until step 3 finishes. The ingest command uses
the files inside the program. So the ingest command uses the old files if you run it before
step 3 finishes.

**Why this matters.** A worker changed a knowledge file. Then the worker ran the ingest command
at once. The chatbot used the old text. The worker did not understand why. The order is the
answer.

### 2.5 The keyword search

The system has a second search method. This method does not use vectors. This method uses
words.

Cloudflare calls this service **D1**. D1 stores the text of every part. D1 also makes a
special index for fast word search. This index is called BM25.

This method is good at exact words. If you ask "OCI 2025", this method finds it quickly.

The vector method is good at meaning. If you ask "does he know cloud work", the vector
method finds the right part.

The system uses both methods. This is called **hybrid search**.

### 2.6 The answer memory

The system stores answers for a short time. This storage is called **KV**. KV is fast. It is
not a real database.

The system uses KV for two jobs.

The first job is the search memory. If you ask the same question twice, the system does not run
the search again. It takes the answer from KV. The system forgets the search memory after 24
hours.

The second job is the answer memory. The system stores the whole answer for a question. A
visitor who asks the same question again gets the answer at once.

**Important:** the system stores a whole answer only for a first question. A first question is a
question that stands alone. "What is Settle?" is a first question. "Tell me more" is not.
"T﻿ell me more" has no meaning without the turn before it.

**Why this rule matters.** The memory key is the words of the question. If the system stored an
answer for "Tell me more", then any visitor who wrote "Tell me more" would receive that answer.
Two visitors could ask it after two different conversations. They would receive the same answer.
One of them would receive the wrong answer. If the answer repeated a name or an email that the
first visitor gave, the second visitor would receive the first visitor's details.

The system does not store an answer for a second question. The second question is not a first
question. The system must not store it.

**Important:** the key also contains two numbers. The first number is the corpus version. The
second number is the prompt version. A worker must change the second number each time a worker
changes the system prompt. Otherwise the system keeps old answers after you change the words
that produce them.

### 2.7 The AI services

The system needs an AI service to write the answer. The system has three AI services. The
system tries them in order.

1. **OpenRouter** — this service has your credit balance. It works at all times.
2. **Groq** — this service is free. It has a daily limit of 200,000 words.
3. **Workers AI** — this service is free. Cloudflare gives you 10,000 units each day. The
   units are called neurons. The limit resets at 00:00 UTC every day.

If the first service fails, the system tries the next one. If all three fail, the system
shows the words from the knowledge file. The system does not show an error message.

### 2.8 Question condensing

If you ask a second question, the question often has words with no meaning by themselves.

Example:

```
First question:  "What is the Deep Research Agent?"
Second question: "How long was he working on it?"
```

The words "he" and "it" have no meaning alone. The system cannot search for them.

Before it searches, the system sends both questions to an AI service. The AI service reads
both questions. Then the AI service rewrites the second question as a full question.

```
"how long was he working on it"
becomes
"how long has Terry worked on the Deep Research Agent"
```

Then the system searches for the full question. The answer is correct.

This step is called **question condensing**.

---

## 3. How a question gets an answer

This section describes each step. The system makes these steps for each question.

### Step 1 — Check the visitor

The system checks three things. It checks the number of questions. It checks the length of
the question. It checks for bad words.

The system uses 20 questions each minute for each visitor. This is a limit for one person.

**Security note:** The system does not use the address from `x-forwarded-for`. A visitor can
change that address. The system uses `cf-connecting-ip`. Cloudflare sets that address. A
visitor cannot change it.

### Step 2 — Condense the question

The system rewrites the second and later questions. Section 2.8 describes this step.

### Step 3 — Find the parts

The system searches three ways at the same time. It searches the word list. It searches the
vectors. It searches the keyword index.

Then the system puts the three lists together. The system does not use one list. The system
uses a **rank** system. This system is called **Reciprocal Rank Fusion**. Section 2.4 describes
this system.

**Important:** the system returns only the parts that matched. It does not return the whole
file. A file has many parts. Most files have parts that do not match. Sending a whole file
sends the parts that do not match. They take space in the prompt. They make the answer worse.

Rank fusion is important. The three search methods give different scores. A score of 200 in
one method is not the same as a score of 200 in another method. Rank fusion uses the
position of each part. Position 1 is always better than position 2. So the scores from
different methods can be compared fairly.

**Important:** the system ADDS the points from each list. It does not keep the best points from
one list.

Example. Three lists find six parts. Part A is first in all three lists. Part B is first in one
list only.

- Part A gets points three times.
- Part B gets points one time.

Part A comes first. The system does not compare the points of part A with the points of part B.
The system adds the points of part A to the points of part A to the points of part A.

**This rule was broken for a long time.** The system kept the best points and threw the other
points away. Under that rule, part A and part B received the same points. A part that three
search methods agreed on received no extra points. The order still looked correct, so nobody
found the error. A worker found it by writing down the correct rule and checking the numbers.

### Step 4 — Write the answer

The system puts the parts and the instructions into one message. Then it sends the message
to an AI service. The AI service writes the answer.

The answer comes back a few words at a time. This is called streaming. The visitor sees the
words appear.

### Step 5 — Check for a contact

The AI service can use two tools. These tools are described in section 6.

The system gives the tools only on some AI services. The system uses OpenRouter and Groq
for tools. The system does not use Workers AI for tools.

**Why?** Your own project notes say the free models did not work well with tools. The
Llama model could not make a tool call. The system must not send a phone notification based
on a broken tool call.

### Step 6 — Send the result

The system sends the answer to the visitor. The system also sends the names of the parts it
used. The visitor can click a name. The name takes the visitor to that part of the page.

**Security note:** The visitor cannot learn whether a notification was sent. The system does
not send any message to the visitor about notifications.

---

## 4. What each part costs

This section is important. Read this section before you change any limit.

| Part | Free amount | When you use it | Your cost |
|---|---|---|---|
| Cloudflare Workers | 100,000 requests each day | Every page visit and every question | $0 |
| Workers AI | 10,000 neurons each day | Loading the knowledge files only | $0 |
| Vectorize | 1 free plan with a large limit | Once for each load | $0 |
| D1 | 5 million rows read each day | Every question | $0 |
| KV | 100,000 reads each day | Every question | $0 |
| Groq | 200,000 words each day | If OpenRouter fails | $0 |
| OpenRouter free model | Depends on the service | Every question | $0 |
| OpenRouter paid model | You pay for each word | If you set a paid model | Small |
| Pushover | One payment when you make the app | Only when you send | One payment |

**Important:** The website can work at no cost. All parts have a free amount. Your OpenRouter
balance gives you more than the traffic you receive.

**Important:** OpenRouter has two kinds of models. Some models are free. Some models use
your balance. The free kind is named `openrouter/free`.

**Caution:** The `openrouter/free` name is not one fixed model. OpenRouter chooses which
free models to use. The choice can change at any time. If you want a fixed model, you must
write the full model name. You must check the model on the OpenRouter website first.

### 4.1 Why the Workers AI neurons are a problem

Workers AI gives you 10,000 neurons each day. The limit resets at 00:00 UTC.

The system used these neurons for two jobs. The system made vectors when you loaded the
knowledge files. The system also rewrote each second question.

The second job used many neurons. A busy day used all 10,000 before midnight. Then the
knowledge files could not load for the rest of the day.

**This is the error you saw.** You ran the load command. The system said:

```
you have used up your daily free allocation of 10,000 neurons
```

The answer is in section 7, decision 3.

---

## 5. One-time work and daily work

This section is important. It explains what you must repeat.

### 5.1 Work you do only when you change something

| Task | How often | Command |
|---|---|---|
| Write or change a knowledge file | Each time you want a change | Your text editor |
| Load the knowledge files | After each change | `curl` in section 10 |
| Change the AI service order | Rarely | `src/server/chat.config.ts` |
| Add a new AI model name | Rarely | `src/server/chat.config.ts` |

### 5.2 Work the system does each time

| Task | How often | Cost |
|---|---|---|
| Vector search | Each question | Free |
| Keyword search | Each question | Free |
| Check the answer memory | Each question | Free |
| Rewrite a second question | Each follow-up question | Small or free |
| Write the answer | Each question | Small or free |
| Send a notification | Only when a visitor gives contact details | Free |

### 5.3 The answer for a simple question

**Important:** A first question is cheap. The system does not rewrite it. The system only
writes the answer.

**Important:** A second question uses two AI calls. The first call rewrites the question. The
second call writes the answer. So a follow-up question takes more time and more words.

---

## 6. Push notifications

### 6.1 What a push notification is

A push notification is a message. It goes from the server to Pushover. Pushover sends the
message to your phone.

This is not a web notification. There is no service worker. There is no web push permission.

The system needs two values from Pushover. The first value is the application token. The
second value is the user key.

The system stores both values as secret keys. Section 10 explains the command.

### 6.2 The two tools

The AI service has two tools. A tool is a function the AI can ask the system to run.

**Tool 1: `record_user_details`**

This tool stores a name, an email address, and a note. Then it sends a notification.

**Tool 2: `record_unknown_question`**

This tool stores a question the assistant could not answer. Then it sends a notification.
This tells you what to add to the knowledge files.

### 6.3 The rules before a notification

The system makes a notification only after six checks pass. This is the most important part
of the whole system. Section 7 explains the reasons.

1. The email address must look like a real address.
2. The address must not be a known example address.
3. The visitor must have typed the address. The system checks the visitor's own words.
4. The visitor must have given at least 20 characters of notes.
5. The system allows one new contact each hour for each visitor.
6. The system allows three new questions each hour for each visitor.
7. The system stores each contact for 24 hours. The system does not send it two times.

### 6.4 The most important rule

**Rule 3 keeps a false notification from going out.** The system uses only the words the
visitor typed. The system does not use the words from the knowledge files.

**Why?** The file `contact.md` contains your email address. If the system used the knowledge
files, the AI could use **your** email address as the visitor's address. Then the system
would send a false notification on every question.

The system also uses an exact word check. It does not use a part-of-a-word check.

**Why?** A visitor can paste a web address. That web address can contain an email address
inside it. The system must not accept an address that only appears inside a longer text.

There are 17 tests for these rules. You must run this command after each change.

```bash
npm run test:notify
```

---

## 7. Decisions we made

This section explains each decision. It also explains the reason.

### Decision 1 — Use Groq for the tools, not Workers AI

**What we decided:** The system uses OpenRouter and Groq for tools. The system does not use
Workers AI for tools.

**Reason:** Your own project notes say three free models failed at tools. Gemini Flash,
Llama 3.3, and Nemotron all failed or made too many calls. The Llama model is the model for
Workers AI. So Workers AI is not safe for tools.

**Result:** If a model cannot make a tool call, it cannot send a false notification. The
system stays quiet. The chat still works.

### Decision 2 — Add OpenRouter as the first AI service

**What we decided:** The system tries OpenRouter first. Then Groq. Then Workers AI.

**Reason:** We saw both free services run out on the same evening. Workers AI had no
neurons. Groq had used 199,806 of its 200,000 words. So most of the day showed the words
from the knowledge file instead of a real answer.

**Result:** The assistant works at all times. It uses your OpenRouter balance.

**Note:** We did not remove Workers AI. It is free and fast while the allowance lasts. There
is no reason to remove a working service. You can remove it in the config file.

### Decision 3 — Move question condensing off Workers AI

**What we decided:** The system rewrites questions on OpenRouter. Workers AI is the last
choice. The system no longer uses most of the 10,000 neurons.

**Reason:** This is the most important decision in this document.

Question condensing ran on Workers AI. Condensing uses many neurons. A busy day used all
10,000 neurons for condensing.

The load command also needs Workers AI. The load command makes one vector for each part of
each file. A file has several parts. All files have many parts. So one load uses many
neurons.

**The chat was taking the budget the load command needed.** So you could not load the
knowledge files. You saw this error:

```
you have used up your daily free allocation of 10,000 neurons
```

**Result:** Now the chat and the load command do not compete. The 10,000 neurons are only
for the load command. A load command now works almost any day.

**Result:** The neurons are also used for vector search. The vector search does not work
until 00:00 UTC. The system uses the other two search methods until then. The answers are
still correct. The answers are not always the best parts.

### Decision 4 — Use only the visitor's words for the email check

**What we decided:** The email check uses only the visitor's own words.

**Reason:** Section 6.4 explains this. The knowledge files contain your email address. A
check that reads the knowledge files would accept your own address as the visitor's address.

### Decision 5 — Use an exact word check for the email

**What we decided:** The system splits the text into whole words. Then it looks for a whole
word that matches the address.

**Reason:** A visitor can paste a web address. A web address can contain an email address
inside it. A part-of-a-word check says yes. An exact word check says no.

### Decision 6 — Use one contact each hour for each visitor

**What we decided:** The system allows one new contact each hour for one visitor. The system
allows three new questions each hour for one visitor.

**Reason:** Without a limit, one person can send 20 messages each minute. The system would
send 20 notifications. Your phone would not stop. A bad word is short to type. A limit
stops this.

### Decision 7 — Keep notifications off for bad words

**What we decided:** A message with a bad word does not send a notification. The system
only writes the word in the log.

**Reason:** A bad word is one word to type. If the system sends a notification for it, the
bad word is a button that anyone can press. The system writes it in the log. You can see
it later. The phone stays quiet.

### Decision 8 — Use the KV memory, not the database, for the contact check

**What we decided:** The system uses KV to remember contacts for 24 hours.

**Reason:** KV is fast and free. It is not always correct at once. A small mistake means
the same contact arrives two times. A small mistake is not a problem. A wrong contact is
not a problem. Money is a problem. A contact is not money. So we use the free option.

### Decision 9 — Use `cf-connecting-ip`, not `x-forwarded-for`

**What we decided:** The system reads `cf-connecting-ip`.

**Reason:** The system uses the address to count questions. The system also uses the address
to count notifications. A visitor can change `x-forwarded-for` with a normal request. Then
the system sees a new visitor each time. The visitor can send unlimited notifications. A
visitor cannot change `cf-connecting-ip`. Cloudflare sets it.

### Decision 10 — Remove the old project file

**What we decided:** We removed the file `projects.md` from the knowledge files.

**Reason:** Two files described your projects. One file described four projects. The other
file described different projects. Both files had the same name on the page. A visitor
could get two different answers to one question.

### Decision 12 — Store a whole answer only for a first question

**What we decided:** The system stores a whole answer in the memory only when the
question stands alone. A second question is never stored.

**Reason:** The memory key is the words of the question. A second question such
as "tell me more" has no meaning alone. The system gave one visitor the answer
that the system made for another visitor. Error 2 describes the risk in full.

### Decision 13 — Add the points from all three lists

**What we decided:** The system adds the points from every list that found a
part. The system does not keep only the best points.

**Reason:** The whole purpose of using three search methods is that they agree
in some places. A part that all three found is confirmed. The system was
throwing that confirmation away. Error 1 describes the error in full.

### Decision 14 — Send the parts, not the files

**What we decided:** The system sends the parts that matched. The system does
not send the whole knowledge file.

**Reason:** The system cuts each file into parts and makes a vector for each
part. The system found the right part. Then the system sent the whole file. The
parts that did not match took the space in the prompt. The system now keeps the
words of each part next to its vector and sends those.

### Decision 15 — Move the work after the build

**What we decided:** The build and the test now run in this order.

```
1. Change the knowledge file
2. Send the change
3. Build and put on the server
4. Load the knowledge files
5. Test the new program
```

**Reason:** The test asked questions of the live site. The live site ran the old
program. The test measured the wrong program. Error 5 describes the error in
full.

### Decision 11 — Add a static knowledge base for the fallback

**What we decided:** The system has a small knowledge base inside the code. This base has
one answer for each main topic.

**Reason:** If all AI services fail, the system still knows the main facts. Your projects
had no entry in this base. A visitor could ask about a project and get no answer at all.

---

## 8. Errors we made

This section describes the errors. Each error has a cause and a rule for next time.

### Error 1 — The system said one thing and did another

Two errors in this list came from the same habit. A worker wrote a word into a
comment. Another worker read the comment and believed it.

- The code said "Reciprocal Rank Fusion". The code did not do Reciprocal Rank
  Fusion. It kept the best points from each list and threw the rest away. A
  part that all three search methods found received no extra points.
- A documentation file said the system sends "the top passages". The code sent
  the whole file. The search found the right part and then threw it away.

**Rule:** a comment is not the code. Write down what the thing should do, then
check the numbers. Do not repeat a claim you have not checked. If you explain
the system to another person, read the source first.

### Error 2 — The answer memory gave one visitor another visitor's reply

The memory key was the words of the question. A second question such as "tell
me more" has no meaning alone. One visitor wrote "tell me more". Another
visitor wrote "tell me more" after a different conversation. The system gave
both visitors the first answer.

**Rule:** store a whole answer only when the question stands alone. Do not
store an answer for a question that depends on the turn before it.

### Error 3 — The chatbot used up the daily amount for the knowledge base

The chat used the 10,000 units each day. The load command also needs these
units. One answer costs much more of these units than one vector. The test
program asks twenty questions each time you send code. When the first AI
service had no credit, all twenty answers used the daily amount for the chat.
The load command then could not run.

**Rule:** give one daily amount to one job. Or buy a plan for the important
job. Do not let a job that runs all day take from a job that runs twice a day.

### Error 4 — Deleted knowledge files stayed answerable

The load command only added and changed. It never removed. A file that a worker
deleted still had text in the search systems. The chatbot answered from a
project that was no longer on the site.

**Rule:** every cleanup must remove what no longer exists. A cleanup that runs
without saying what it removed is a cleanup nobody can check.

### Error 5 — A test measured the old program

The test program asked questions of the live site. The live site ran the old
program at that time. The new program was not on the site yet. The test passed
and told you nothing about your change.

**Rule:** test the new program, not the old one. Send the code first. Then
test.

### Error 6 — The chat showed "Something went wrong" when it worked

**What happened:** A visitor asked a question. The server sent a correct answer. The chat
showed an error message.

**Cause:** The chat read words only from the message stream. The server sends the full
answer in a second message. The chat did not read the second message. So the chat found no
words. Then the chat showed an error.

**Rule:** Test every answer path. The system has four paths. A normal answer, a busy
answer, no-AI answer, and a long question. Test all four.

### Error 7 — We fixed the test but not the chat

**What happened:** The test program read the second message. The chat program did not. So
the test passed. The chat failed.

**Rule:** Fix the cause, not only the place where you see the problem. Find every place
that reads the answer. Fix all of them together.

### Error 8 — A missing file stopped the build

**What happened:** We removed two images from the project. The page still used them. The
build failed.

**Rule:** After you remove a file, search for its name. The name can be in ten places.

### Error 9 — The photo was cut so the person was not in the picture

**What happened:** A photo showed no person. The photo is tall. The box on the page was
wide. The system cut the top and the bottom. The person was at the top.

**Rule:** Look at the photo before you change the box. Count where the subject is in the
photo. Then set the position.

### Error 10 — The name of the account was wrong in three places

**What happened:** Your Instagram name was wrong in the page, in the data for search
engines, and in the chat answer. It was correct in only one file.

**Rule:** Find the true value first. Then search for the wrong value everywhere.

### Error 11 — The system could not load the knowledge files

**What happened:** The load command failed. The error said the daily amount was finished.

**Cause:** Section 7, decision 3 explains this.

**Rule:** Do not use the same daily amount for two jobs. One job can take everything.

### Error 12 — The system made many calls that could not work

**What happened:** The system tried Groq. Groq was full. The system tried again for each
visitor. Each failed call used a little more of Groq's daily amount.

**Rule:** A limit that says no still uses a small amount. A system must stop at the first
limit. A system must not keep trying a service that already said no.

### Error 13 — Old files stay in the search systems forever

**What happened:** We removed a knowledge file. The system still had it. A visitor could
get the old information.

**Cause:** The load command adds and changes files. The load command does not remove files.

**Rule:** The load command must remove files that you deleted. We must add this step.

### Error 14 — The system was slower after we made it correct

**What happened:** A follow-up question took 9 seconds. Before the change, it took 4
seconds. The old answer was wrong. The new answer is correct.

**Cause:** Now the system makes two AI calls. First it rewrites the question. Then it
writes the answer. The two calls are not at the same time. They are one after the other.

**Rule:** A correct answer can be slow. Measure both. If the time is too much, use a
smaller model for the rewrite.

---

## 9. How to work better next time

This section gives you a list of rules for the next project.

### 9.1 Rules for the plan

1. Read the plan files in the project before you start. Do not start from the code.
2. Remove old plan files. A plan for an old system will send you in the wrong direction.
3. Write down what each part costs. Know the limit before you use it.
4. Give each daily amount to one job only. Or buy a plan for the important job.

### 9.2 Rules for the code

1. Keep the settings in one file. Do not put a model name in the code.
2. Make a list of the settings. Give each setting a comment that says why it is there.
3. Search for the old value after you change a value. The name can be in many files.
4. After you remove a file, search for its name.
5. Do not leave a job for a person to remember. The system must do it.
6. Put the job in the deploy system if the job must happen each time.

### 9.3 Rules for the test

1. Write a test for each rule that protects the system. A rule with no test will break.
2. Test the bad path. Do not only test the good path.
3. Look at the output of the deployed system. Do not only look at the code.

### 9.4 Rules for the deploy

1. Put the secret keys in place before you put the code in place. Section 10 explains
   this.
2. Check the deploy at the end. Look at the real site. Do not trust the green sign.
3. Add a test for the new page. The old test checked only the chat. A broken page can pass
   the test.

### 9.5 What we must still do

This list is not finished. These items are not done.

1. Add a step to the deploy system. The step must load the knowledge files. A person must
   not need to remember this step.
2. Add a step to the load command. The step must remove old files.
3. Use a smaller model for the question rewrite. This makes the answer faster.
4. Show the answer a few words at a time on the OpenRouter service. Now the answer appears
   at one time.

---

## 10. Commands you must know

### 10.1 Put a secret key in place

You must use this command for each secret key. The command asks you for the value. You
paste the value. The command sends the value to Cloudflare. The value is not in your
computer. You cannot read the value later.

```bash
npx wrangler secret put KEY_NAME
```

The system uses these keys. You must put all five in place.

| Key name | Where to get the value |
|---|---|
| `OPENROUTER_API_KEY` | openrouter.ai |
| `GROQ_API_KEY` | console.groq.com |
| `INGEST_KEY` | You make this value. Section 10.2 explains. |
| `PUSHOVER_TOKEN` | The Pushover website. You make the app. |
| `PUSHOVER_USER` | The Pushover website. Your user key. |

**Important:** A secret key must never go in a file that goes to the internet. Never put a
secret key in these places:

- Do not put it in `wrangler.jsonc`
- Do not put it in a file in the project
- Do not put it in a name that starts with `VITE_`

**Reason:** `vite.config.ts` sends every `VITE_` value to the visitor's computer. A secret
key with that name is visible to everyone.

### 10.2 Make a new ingest key

You need this only if you do not have the old value. The old value is not readable. You
cannot ask Cloudflare for it.

```bash
openssl rand -hex 32
npx wrangler secret put INGEST_KEY
```

The first command makes a long random text. The second command asks for it. Paste the text.

### 10.3 Load the knowledge files

You must run this command after you change a knowledge file. You must wait for 00:00 UTC
each time the system says the daily amount is finished.

```bash
curl -X POST https://terrymathew.com/api/ingest \
  -H "x-ingest-key: YOUR_KEY_HERE"
```

The system sends back some numbers. Look for this line.

```json
{
  "ok": true,
  "indexed": 24,
  "unchanged": 0,
  "dimensions": 768,
  "message": "Indexed 24 chunk(s) at 768 dimensions."
}
```

**`ok: true` means the command worked.**

Read the numbers.

- `indexed` — the number of new parts. The system made vectors for these parts.
- `unchanged` — the number of parts that did not change. The system did not make vectors
  for these parts.
- `dimensions` — this must say 768. Another number means the vectors and the search index
  do not match.

**Important:** This command uses neurons. Each part of each file uses neurons. Wait for
00:00 UTC if the command fails with a 4006 error.

### 10.4 Check the system works

```bash
npm run lint
npx tsc --noEmit
npm run test:notify
npm run build
```

The system must have no errors. The test must show 17 passes and 0 failures.

### 10.5 Look at the search systems

These commands show you what the system has in storage. These commands do not change
anything.

```bash
# Show the files in the database
npx wrangler d1 execute terry-knowledge --remote \
  --command "SELECT id, category, length(content) FROM documents ORDER BY id"

# Look at the live logs
npx wrangler tail terry-portfolio --format pretty
```

The log shows you which AI service answered. The log also shows you why a service failed.

### 10.6 Commands you must not use

Do not use these commands in the normal work. These commands can break the system.

| Command | Why you must not use it |
|---|---|
| `npx wrangler d1 execute --command "DELETE FROM documents"` | This removes the text from all search systems. You must load the files again. |
| `npx wrangler secret delete` | The service stops. The system loses this part. |
| `npx wrangler tail --format json` on a busy site | This makes a large amount of text. |

---

## 11. Words used in this document

These words have a special meaning in this document.

| Word | Meaning |
|---|---|
| **AI service** | A company on the internet that writes the answer. OpenRouter, Groq, and Workers AI are AI services. |
| **Chunk** | A small part of a knowledge file. Each chunk has one vector. |
| **Embedding** | A list of 768 numbers. The list shows the meaning of a chunk. |
| **Vector** | The same as an embedding. |
| **Vectorize** | The Cloudflare service that stores and searches vectors. |
| **Ingest** | The command that loads the knowledge files. |
| **RAG** | Retrieval-Augmented Generation. The system finds the facts first. Then it asks the AI to write the answer. |
| **Hybrid search** | The system uses two search methods. It uses vectors and words. |
| **Rank fusion** | The system puts the results of the search methods together by position. |
| **Question condensing** | The system rewrites a short question into a full question. |
| **Tool** | A function the AI can ask the system to run. |
| **Secret key** | A value the system reads. A person cannot read it later. |
| **Token** (for secrets) | The secret key value from Pushover. |
| **Token** (for AI) | A part of a word. An AI service counts tokens. |
| **Neuron** | The Cloudflare unit for AI work. The free amount is 10,000 each day. |
| **Tool call** | When the AI asks the system to run a tool. |

---

## Summary

The chat assistant finds facts in your own files. Then an AI service writes the answer. The
system uses OpenRouter first. It uses Groq and Workers AI as backup.

You must run the load command each time you change a file. The load command needs 10,000
neurons each day. The question rewrite now uses OpenRouter. So the chat does not take those
neurons. This change makes the load command work almost any day.

The system sends a notification to your phone when a visitor gives contact details. Six
rules must pass first. Seventeen tests protect these rules. You must run the tests after
each change.

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
8. [Errors we made, and the fixes](#8-errors-we-made-and-the-fixes)
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

**You must run this command each time you change a knowledge file.** In practice the
deploy workflow does this for you: the knowledge files are bundled into the build, so the
command runs only after the new build is live. Running it earlier loads the old text.
A content change also needs the corpus version bumped, because the answer and retrieval
caches are keyed on it and would otherwise serve the previous wording for a day.

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
special index for quick word search. This index is called BM25.

This method is good at exact words. If you ask "OCI 2025", this method finds it quickly.

The vector method is good at meaning. If you ask "does he know cloud work", the vector
method finds the right part.

The system uses both methods. This is called **hybrid search**.

### 2.6 The answer memory

The system stores answers for a short time. This storage is called **KV**. KV is quick. It is
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

| Part                  | Free amount                       | When you use it                     | Your cost   |
| --------------------- | --------------------------------- | ----------------------------------- | ----------- |
| Cloudflare Workers    | 100,000 requests each day         | Every page visit and every question | $0          |
| Workers AI            | 10,000 neurons each day           | Loading the knowledge files only    | $0          |
| Vectorize             | 1 free plan with a large limit    | Once for each load                  | $0          |
| D1                    | 5 million rows read each day      | Every question                      | $0          |
| KV                    | 100,000 reads each day            | Every question                      | $0          |
| Groq                  | 200,000 words each day            | If OpenRouter fails                 | $0          |
| OpenRouter free model | Depends on the service            | Every question                      | $0          |
| OpenRouter paid model | You pay for each word             | If you set a paid model             | Small       |
| Pushover              | One payment when you make the app | Only when you send                  | One payment |

**Important:** The website can work at no cost. All parts have a free amount. Your OpenRouter
balance gives you more than the traffic you receive.

**Important:** The system does not use OpenRouter's free routing alias. It names a full,
pinned model id: `anthropic/claude-sonnet-4.5` for answers and tool calls, and
`anthropic/claude-haiku-4.5` for rewriting follow-up questions.

**Why not the alias:** the free name such as `openrouter/free` is not one fixed model.
OpenRouter chooses what backs it, and can change that without notice. Because the same
model id also governs tool calling, a silent swap changes how contact details are captured
and not only how answers are phrased — and the chatbot keeps answering throughout, so
nothing looks broken. Pin the id and check it on the OpenRouter website first.

**Note:** the tool round trip on the pinned id has not been verified live. A check script
exists for that (`npm run verify:models`); until it has been run with a key, treat the
pinned ids as configured rather than proven.

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

| Task                             | How often                   | Command                     |
| -------------------------------- | --------------------------- | --------------------------- |
| Write or change a knowledge file | Each time you want a change | Your text editor            |
| Load the knowledge files         | After each change           | `curl` in section 10        |
| Change the AI service order      | Rarely                      | `src/server/chat.config.ts` |
| Add a new AI model name          | Rarely                      | `src/server/chat.config.ts` |

### 5.2 Work the system does each time

| Task                      | How often                                 | Cost          |
| ------------------------- | ----------------------------------------- | ------------- |
| Vector search             | Each question                             | Free          |
| Keyword search            | Each question                             | Free          |
| Check the answer memory   | Each question                             | Free          |
| Rewrite a second question | Each follow-up question                   | Small or free |
| Write the answer          | Each question                             | Small or free |
| Send a notification       | Only when a visitor gives contact details | Free          |

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

**What we decided:** The system tries OpenRouter first. Then Groq. Workers AI is not in
the generation chain at all.

**Reason:** We saw both free services run out on the same evening. Workers AI had no
neurons. Groq had used 199,806 of its 200,000 words. So most of the day showed the words
from the knowledge file instead of a real answer.

**Result:** The assistant works at all times. It uses your OpenRouter balance.

**Note:** We later removed Workers AI from generation entirely, which reversed the
reasoning above. Keeping it as a last-resort tier is not free: it is the tier that gets
reached exactly when the other two are exhausted, which is when the evaluation suite is
also running. The cost of one answer there is orders of magnitude more of the daily
allowance than one embedding, so the fallback answers were spending the budget the corpus
rebuild needed. Workers AI now produces embeddings and nothing else.

### Decision 3 — Move question condensing off Workers AI

**What we decided:** The system rewrites questions on OpenRouter, using a pinned
`anthropic/claude-haiku-4.5`. Workers AI is not used for rewriting. The system no longer
uses most of the 10,000 neurons.

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

**Reason:** KV is quick and free. It is not always correct at once. A small mistake means
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

### Decision 11 — Add a static knowledge base for the fallback

**What we decided:** The system has a small knowledge base inside the code. This base has
one answer for each main topic.

**Reason:** If all AI services fail, the system still knows the main facts. Your projects
had no entry in this base. A visitor could ask about a project and get no answer at all.

---

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

## 8. Errors we made, and the fixes

This section is the record. Every error is here with its cause, the change we
made, and how we know the change worked.

Most of these errors had no error message. The system reported success. The
work looked finished. Only a check found the fault. That is the pattern worth
taking from this list, and it is written out at the end of the section.

### 8.1 The list at a glance

| #   | Error                                                 | Fix                                                   | How we know                                        |
| --- | ----------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| 1   | Chat showed an error when the answer was correct      | Read the answer from the last message                 | Asked a question, saw the real reply               |
| 2   | The test was fixed but the chat was not               | Searched for every reader of the answer               | Both paths read the answer now                     |
| 3   | A deleted file broke the build                        | Searched for the name after deleting                  | The build finishes                                 |
| 4   | A photo cut the person out of the frame               | Set the position of the window                        | The person is in the picture                       |
| 5   | A name was wrong in three places                      | Found the true value, then searched for the wrong one | The page, the data, and the chat all agree         |
| 6   | The chat spent the units that the load command needed | Gave the units to one job only                        | The load command works all day                     |
| 7   | Failed calls used up the rest of the limit            | Stop at the first limit                               | The count stops rising                             |
| 8   | Deleted knowledge stayed answerable                   | The load command now removes it                       | The removed file is gone from the answer           |
| 9   | The slow path was correct but took 9 seconds          | Cut the time each step may take                       | The reply arrives before the browser stops waiting |
| 10  | The code said one thing and did another               | Write the correct rule, then check the numbers        | A test shows the numbers                           |
| 11  | One visitor could receive another visitor's reply     | Store a whole answer only for a first question        | Two conversations, one reply each                  |
| 12  | The parts that matched were thrown away               | Keep the words next to each vector                    | The model receives parts, not files                |
| 13  | The backup service was never tried                    | Use a list of services, not a choice of one           | A failing service moves to the next                |
| 14  | A new rule worked against an old rule                 | Write what the rule must not allow                    | The rule now refuses facts from memory             |
| 15  | A test measured the old program                       | Test after the program is on the server               | The test scores the new version                    |
| 16  | A limit was set but never applied                     | Use one code path for both routes                     | A 9.7 MB request becomes 9,600 characters          |
| 17  | A true number made a measurement wrong                | Report what actually happened                         | A cache hit no longer reads as an outage           |
| 18  | A build step reported success and did nothing         | Make the step able to fail                            | The build fails when the key is missing            |
| 19  | The keyword index was a frozen copy of an old month   | Write to it on every load                             | The result is thicker than the old placeholder     |
| 20  | The search said "hybrid" while one method ran         | Count the methods that returned                       | A test fails below two                             |
| 21  | A note promised a repair the code did not contain     | Write the repair                                      | The log names how many documents needed it         |
| 22  | The test for a broken system was skipped by it        | Give the search its own address                       | The test no longer skips                           |

### 8.2 The records

#### 1 — The chat showed an error when the answer was correct

**What happened.** A visitor asked a question. The server sent a correct
answer. The chat showed "Something went wrong."

**Cause.** The chat read words only from the first kind of message. The server
sends the full answer in a second kind of message. The chat did not read the
second kind. So the chat found no words. Then the chat showed an error.

**Why it stayed hidden.** Three answers send no words at all: a busy answer, a
long question, and the answer used when no AI service can be reached. The
fourth path works. So the fault appeared only in the evening, when the free
services had no credit left.

**The fix.** The chat now reads the answer from the second kind of message
when the first kind sent nothing.

**How we know.** We sent a question that produces no words. The count of first
kind messages was 0. The visitor received the correct answer.

**Rule.** Test every answer path, not only the simple one.

---

#### 2 — We fixed the test but not the chat

**What happened.** The test program read the answer from the second kind of
message. The chat program did not. The test passed. A visitor saw an error.

**Cause.** We looked at the place where we saw the fault. We did not look for
every other place that reads the same thing.

**The fix.** We searched the whole codebase for every reader of the answer.

**How we know.** Both places read the answer now.

**Rule.** Fix the cause. Do not fix only the place where you saw the problem.

---

#### 3 — A deleted file broke the build

**What happened.** Two pictures were removed. The page still used them. The
build failed.

**Cause.** We deleted the files. We did not search for their names.

**The fix.** After removing a file, search for its name. A name can be in ten
places.

**How we know.** The build finishes.

**Rule.** A file name lives in more than one place.

---

#### 4 — A photo cut the person out of the frame

**What happened.** A photo showed no person. The photo is tall. The box on the
page was wide. The system cuts the top and the bottom of a tall photo to fill
a wide box. The person was at the top. So the person was cut away.

**Cause.** We chose the shape of the box without looking at the photo.

**The fix.** We set where the window sits on the photo. The window now sits at
the top, and to the right, where the person is.

**How we know.** The person is in the picture.

**Rule.** Look at the picture before you change the box.

---

#### 5 — A name was wrong in three places

**What happened.** One account name was wrong on the page, in the data for
search engines, and in the answer the chat gives. It was right in one file.

**Cause.** We changed one file. The name also existed in three others.

**The fix.** We found the file with the true value first. Then we searched for
the wrong value everywhere.

**How we know.** The page, the data, and the chat now agree.

**Rule.** Find the true value first. Then search for the wrong one.

---

#### 6 — The chat spent the units that the load command needed

**What happened.** The load command failed. The message said the daily amount
was finished.

**Cause.** Cloudflare gives 10,000 units each day for the AI work. Both jobs
drew from the same units. One written answer costs far more of them than one
vector. So a small number of answers used the whole day.

**The worst part.** The test program asks twenty questions each time you send
code. When the first AI service had no credit, all twenty answers used the
daily amount for the chat. So the chat spent the units that the load command
needed. The knowledge base could not be updated because the chatbot had been
answering questions.

**The fix.** The AI service on Cloudflare now makes vectors. It does not write
answers. The units serve the vector work only. Two other services write the
answers.

**How we know.** The load command works at any time of day.

**Rule.** Give one daily amount to one job. A job that runs all day must not
take from a job that runs twice a day.

---

#### 7 — Failed calls used up the rest of the limit

**What happened.** A service said no. The system asked it again for every
visitor. Each call that failed still used a small part of the daily amount.

**Cause.** The system tried every service in turn even after one had said no.

**The fix.** The system stops at the first service that says no.

**How we know.** The number of used units stops rising.

**Rule.** A service that has already said no will say no again. Do not ask.

---

#### 8 — Deleted knowledge stayed answerable

**What happened.** A knowledge file was removed from the site. The chatbot
still answered questions about it. It was asked for a project that was no
longer on the page and it answered in full.

**Cause.** The load command only added and changed. It never removed. Two kinds
of old data survived it: a file that was deleted, and a file that became
shorter and kept the parts past its new end.

**The fix.** The load command now looks at what the files actually contain. It
deletes anything the files do not account for. It also reports how much it
deleted.

**How we know.** The removed project is gone. The count is in the answer from
the load command.

**Rule.** A cleanup that does not say what it removed is a cleanup nobody can
check.

---

#### 9 — The slow path was correct but too slow

**What happened.** A second question took 9 seconds. Before the change it took
4 seconds. The old answer was wrong. The new answer was right.

**Cause.** The system now makes two calls. First it rewrites the question. Then
it writes the answer. The two calls happen one after the other.

**The second problem.** The browser stops waiting after 30 seconds. The test
scored a 33-second answer as a pass. A visitor would have seen an error.

**The fix.** We cut the time each step may take: 12 seconds for a tool call,
15 for an answer, 5 for a rewrite. We did not raise the browser's limit. A
33-second answer is a poor answer even when it arrives.

**How we know.** The reply arrives before the browser stops waiting.

**Rule.** A correct answer can still be too slow. Measure both the truth and
the time.

---

#### 10 — The code said one thing and did another

**What happened.** Two faults with the same shape.

- The code said "Reciprocal Rank Fusion." It did not do that. It kept the best
  points from each list and threw the other points away. A part that all three
  search methods found received no extra points for being found by all three.
- A document said the system sends "the top parts." The code sent the whole
  file. The search found the right part and then threw it away.

**Why it stayed hidden.** A system that keeps the best points and a system that
adds the points both produce an order that looks correct. Nothing in any log
looked wrong. And a comment is not the code.

**How it was found.** Someone wrote down what Reciprocal Rank Fusion actually
does. Then they checked the numbers against it. The two did not match.

**The fix.** The points from all three lists are now added together. The words
of each part are now stored next to its vector, and the parts that matched are
what reach the model.

**How we know.** Seven tests show the numbers. One of them shows that the old
code would fail.

**Rule.** A comment is not the code. When you explain the system to another
person, read the source first.

---

#### 11 — One visitor could receive another visitor's reply

**What happened.** The answer memory used the words of the question as its
key. A second question such as "tell me more" has no meaning alone. One visitor
wrote it after one conversation. Another visitor wrote it after a different
conversation. The system gave both visitors the first answer.

**Why this was the most serious error here.** If an answer ever repeated a
name or an email that the first visitor gave, the stored copy would have given
one visitor another visitor's details.

**The fix.** The system stores a whole answer only when the question stands
alone. A second question is never stored. The key also holds the version of the
system prompt, so a change to the words cannot keep serving answers written
under the old words.

**How we know.** We asked the same first question twice. The second time was
stored. Then we asked "tell me more" in two different conversations. Neither
was stored, and the two answers were different.

**Rule.** Store a whole answer only when the question stands alone.

---

#### 12 — The parts that matched were thrown away

**What happened.** Vectorize keeps one vector for each part. The search found
the right part. Then the system took the whole file that the part came from and
sent that instead. Every unrelated part took space in the prompt.

**Why it stayed hidden.** The order of the results was correct. The search
worked. Only the text sent to the model was wrong, and nothing reports the size
of a prompt.

**The fix.** The words of each part are stored next to its vector. The parts
that matched are what reach the model.

**How we know.** The model receives parts. A file that is ten parts long no
longer sends all ten.

**Rule.** Sending more text than you need is a fault, even when the order of
the results is right.

---

#### 13 — The backup service was never tried

**What happened.** The tools for the notifications chose one service. If that
service had no key, or if it failed, the system stopped. The second service was
never used, even though the note above the code said it was the backup.

**Cause.** The code made a choice between two services. A choice stops at the
first option. A list moves to the next.

**The fix.** The code now holds a list. A service that fails moves to the next
one.

**How we know.** The tests cover the order of the services.

**Rule.** A backup that is never tried is not a backup.

---

#### 14 — A new rule worked against an old rule

**What happened.** We added a rule to fix a problem with the voice. The new
rule said the model may reply from its own knowledge of Terry. An old rule
said the model may only use the retrieved text and must never make a fact up.

**Why it matters.** The subject is a real person. A rule that lets the model
supply facts from memory is the one rule that must not bend for the sake of
tone.

**The fix.** The new rule allows voice only. It states that a fact about Terry
must come from the files, and that "I do not know that one" is the correct
answer when the files do not have it.

**How we know.** The rule now refuses facts from memory.

**Rule.** When you add a rule, read it next to every rule it touches.

---

#### 15 — A test measured the old program

**What happened.** The test asked questions of the live site. The live site ran
the program from before the change. The change had not reached the server yet.
The test passed and said nothing about the change.

**The fix.** The test now runs after the program is on the server. The build
order is now: tests, then build, then send, then load the knowledge, then check
the retrieval, then test the questions.

**How we know.** The test scores the version that was just sent.

**Rule.** Test the new program, not the one it replaces.

---

#### 16 — A limit was set but never applied

**What happened.** The length of a conversation was limited in the settings.
Two routes accepted a conversation. One route used the limit. The route the
site actually used did not. A client could send one request with a very large
amount of text, and all of it went into the prompt.

**Why it stayed hidden.** Nothing failed. The answer came back. It was simply
more expensive than it should have been.

**Why it happened.** Three separate settings existed for one rule. The route
that was not used read one of them.

**The fix.** One code path now applies the limit. Both routes use it. The other
two settings are gone.

**How we know.** We sent a request of 9.78 MB. The system answered normally.
Only 9,600 characters reached the prompt.

**Rule.** A setting that nothing reads is not a setting. Search for the value.

---

#### 17 — A true number made a measurement wrong

**What happened.** When the answer memory gave an answer, the system reported
no AI service and no real search. It was true — no service had run. But the
test program read those numbers as a fault. Healthy answers were scored as
outages. The sources also disappeared from the page.

**Cause.** We described a stored answer in the words used for a fault.

**The fix.** The stored answer now keeps the true search method, the true
service, and the sources. A hit returns all three.

**How we know.** A cache hit no longer reads as an outage. The sources stay on
the page.

**Rule.** Report what happened. Two true numbers can still be measured wrongly.

---

#### 18 — A build step reported success and did nothing

**What happened.** The build step that loads the knowledge files reported
success. It had loaded nothing. The step sent a request with an empty key. The
site said no. The step only gave a warning, so the step passed.

**Why it stayed hidden.** A step that cannot fail cannot tell you anything. And
a green mark looks exactly like a green mark from a step that did its work.

**The fix.** The step now tells three cases apart: no key set, request refused,
and files not loaded. The last two stop the build. The first names the command
that fixes it.

**How we know.** The build now fails when the key is missing.

**Rule.** The pattern that runs through all of these: a system that reports
success is not evidence that it worked. Six of these errors returned a correct
result while doing nothing, or did nothing while returning a correct result.

---

#### 19 — The keyword index was a photograph of an old month

**What happened.** A visitor asked the chatbot about Terry's trips. The chatbot
answered with his job title. The document that describes his trips was in the
search system the whole time. The search simply did not return it for that
question.

**Cause.** Three things, each on its own enough to do this.

- The keyword table had no writer. Code read the table on every search. No code
  wrote to it. Its nine rows came from somewhere else, at a time when the
  documents were different.
- Nothing ever updated those rows. They were frozen. The row for the projects
  document was 230 characters while the file on disk was 3,068. The row for the
  experience document was 482 characters against 3,967 on disk.
- The rows held a file that had been deleted, and had no row for a file that
  had been added. The search was answering confidently from a corpus that no
  longer described the site.

**Why it stayed hidden.** The search returned results. They were the wrong
results, but results. Nothing reported that the rows were old.

**The fix.** The load command now writes to the keyword table in the same loop
that writes the documents, so the two cannot drift. It removes the old row
first, because that table cannot update a row in place. When it removes a
document that no longer exists, it removes that document's keyword row too.

**How we know.** A test asks whether the keyword result is thicker than the old
placeholder. The old one was 482 characters.

---

#### 20 — The search said "hybrid" while running on one method

**What happened.** The health check reported that the search was running in
hybrid mode. Hybrid mode means more than one method returned something. Only
one did.

**Cause.** The mode was set from the call finishing without an error. The search
function catches its own errors and returns whatever it has, including nothing.
A call that finishes successfully proves nothing about what contributed to it.
So a search running on a single hand-written keyword table reported itself as
hybrid, the same as a search with all three methods working.

**Why this matters more than it sounds.** This is the same fault as error 17 —
a number that reads as a health signal and measures nothing. It is the reason a
dead vector path and a stale keyword index both looked fine for as long as they
did.

**The fix.** The mode is now built from the methods that actually returned a
result. One method reports what that method is. Two or more report hybrid. None
reports that there is nothing.

**How we know.** A test asks the search for a method count and fails when fewer
than two contributed.

---

#### 21 — A note promised a repair that the code did not contain

**What happened.** A comment in the passage-retrieval code said a document with
no stored passage would fall back to its full text. The line under it returned
nothing instead.

**Cause.** The comment described the intended behaviour. The code did not do it.
The comment was written first, as a plan, and the code under it was written to
something easier — drop the document.

**Why it matters.** A document with no stored passage was dropped from the vector
search entirely. Every document was affected, because the passage table was
empty. So the vector search was returning nothing while reporting success, and
the comment above it said it was degrading gracefully.

**The fix.** The code now fetches the full text for any document whose passage
is missing, and warns in the log how many it had to do this for.

**How we know.** The warning names the count. A zero means the passage table is
complete.

**Rule.** A comment describing behaviour the code does not have is worse than no
comment. It stops the next person reading the code and stops them checking.

---

#### 22 — The test for a broken system was skipped by the broken system

**What happened.** The test that checks the search would look at the result of
the chatbot's answer. When the answer came from the answer memory, the test had
nothing to look at. It passed by skipping.

**Cause.** The test asked the chatbot a question and read the sources. The
chatbot returns from its answer memory before the search runs. So the one
condition under which the test had something to say — the corpus is stale and
the answer is served from memory — is the one condition where the test said
nothing.

**The fix.** A new address runs the search and stops. It does not write an
answer and does not read the answer memory. The test uses it. It needs the same
key as the load command, and it gives nothing to a caller without that key.

**How we know.** The test no longer skips when the answer is remembered.

**Rule.** A check that cannot run in the state you most need it is not a check.

## 9. How to work better next time

This section gives rules for the next project. Each rule comes from an error in
section 8.

### 9.1 Rules for the plan

1. Read the plan files before you start. Do not start from the code.
2. Remove old plan files. A plan for an old system sends you the wrong way.
3. Write down what each part costs. Know the limit before you use it.
4. Give each daily amount to one job only.
5. Name the service that writes the answer. A free service is not free.

### 9.2 Rules for the code

1. Keep the settings in one file.
2. Give each setting a comment that says why it is there.
3. Search for the old value after you change a value.
4. After you remove a file, search for its name.
5. Do not leave a job for a person to remember.
6. Give one rule one setting. Three settings for one rule lose it.
7. Check the numbers. A comment is not the code.
8. Read a new rule next to every old rule it touches.

### 9.3 Rules for the text

1. Keep the knowledge files written for a reader.
2. Also write them for the search. The words a visitor uses are often not the
   words you wrote.
3. After you write a section, ask a question it should answer. Then ask it.
4. Send the parts that matched. Do not send the whole file.

### 9.4 Rules for the test

1. Write a test for each rule that protects the system.
2. Test the bad path. Do not only test the good path.
3. Write the expected number out. A reader must be able to check it.
4. Write a test that the old code would fail. Then a fault cannot return.
5. Look at the output of the deployed system. Not the code.

### 9.5 Rules for the deploy

1. Put the secret keys in place before the code that needs them.
2. Test the new program, not the one it replaces.
3. Make every step able to fail. A step that cannot fail tells you nothing.
4. Do not trust a green sign. Read what the step said.
5. Add a test for the new page. A broken page passes a chat-only test.

### 9.6 Rules for the memory

1. Store a whole answer only when the question stands alone.
2. Put a version of the prompt in the key. Then a change retires old answers.
3. Store what the parts say. Do not store a fault as if it were a result.

### 9.7 What we must still do

This list is not finished.

1. Set `INGEST_KEY` as a secret of the build system. Then the build loads the
   knowledge files by itself. Section 10.1 explains the command.
2. Use a smaller model for the question rewrite. The rewrite makes the answer
   slower.
3. Show the answer a few words at a time on the OpenRouter service. Now the
   whole answer appears at one time.
4. Move the daily limit for questions to a shared store. Now each Worker holds
   its own count and a limit resets when the Worker moves.

## 10. Commands you must know

### 10.1 Put a secret key in place

You must use this command for each secret key. The command asks you for the value. You
paste the value. The command sends the value to Cloudflare. The value is not in your
computer. You cannot read the value later.

```bash
npx wrangler secret put KEY_NAME
```

The system uses these keys. You must put all five in place.

| Key name             | Where to get the value                      |
| -------------------- | ------------------------------------------- |
| `OPENROUTER_API_KEY` | openrouter.ai                               |
| `GROQ_API_KEY`       | console.groq.com                            |
| `INGEST_KEY`         | You make this value. Section 10.2 explains. |
| `PUSHOVER_TOKEN`     | The Pushover website. You make the app.     |
| `PUSHOVER_USER`      | The Pushover website. Your user key.        |

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

| Command                                                     | Why you must not use it                                                       |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `npx wrangler d1 execute --command "DELETE FROM documents"` | This removes the text from all search systems. You must load the files again. |
| `npx wrangler secret delete`                                | The service stops. The system loses this part.                                |
| `npx wrangler tail --format json` on a busy site            | This makes a large amount of text.                                            |

---

## 11. Words used in this document

These words have a special meaning in this document.

| Word                    | Meaning                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **AI service**          | A company on the internet that writes the answer. OpenRouter and Groq are AI services. Workers AI supplies embeddings only and is not an AI service in this sense. |
| **Chunk**               | A small part of a knowledge file. Each chunk has one vector.                                                                                                       |
| **Embedding**           | A list of 768 numbers. The list shows the meaning of a chunk.                                                                                                      |
| **Vector**              | The same as an embedding.                                                                                                                                          |
| **Vectorize**           | The Cloudflare service that stores and searches vectors.                                                                                                           |
| **Ingest**              | The command that loads the knowledge files.                                                                                                                        |
| **RAG**                 | Retrieval-Augmented Generation. The system finds the facts first. Then it asks the AI to write the answer.                                                         |
| **Hybrid search**       | The system uses two search methods. It uses vectors and words.                                                                                                     |
| **Rank fusion**         | The system puts the results of the search methods together by position.                                                                                            |
| **Question condensing** | The system rewrites a short question into a full question.                                                                                                         |
| **Tool**                | A function the AI can ask the system to run.                                                                                                                       |
| **Secret key**          | A value the system reads. A person cannot read it later.                                                                                                           |
| **Token** (for secrets) | The secret key value from Pushover.                                                                                                                                |
| **Token** (for AI)      | A part of a word. An AI service counts tokens.                                                                                                                     |
| **Neuron**              | The Cloudflare unit for AI work. The free amount is 10,000 each day.                                                                                               |
| **Tool call**           | When the AI asks the system to run a tool.                                                                                                                         |

---

## Summary

The chat assistant finds facts in your own files. Then an AI service writes the
answer. The system uses OpenRouter first, with a pinned Claude model, and Groq as
the fallback for both answers and tool calls. Workers AI supplies the embeddings
and writes nothing.

You must run the load command each time you change a file. The load command
needs 10,000 units each day. The question rewrite now uses OpenRouter. So the
chat does not take those units. This change makes the load command work almost
any day.

The system sends a notification to your phone when a visitor gives contact
details. Six rules must pass first. Seventeen tests protect these rules. You
must run the tests after each change.

Section 8 is the record of eighteen errors. Each one has its cause, its fix, and
the check that found it. Six of them reported success while doing nothing, or
did nothing while reporting success. That is the lesson worth carrying into the
next project: a system that says it worked is not proof that it worked.

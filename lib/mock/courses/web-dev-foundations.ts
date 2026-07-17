import type { CourseContent } from "@/lib/types";

/**
 * Starter course: how the web actually works, from HTTP to a deployed page.
 * Vendor-neutral and framework-free — pure fundamentals a new engineer needs
 * before picking any particular stack.
 */
export const webDevFoundations: CourseContent = {
  contentId: "content-web-dev-foundations",
  title: "Web Development Foundations",
  description:
    "Understand how the web works end to end: HTTP and DNS, HTML and CSS, JavaScript in the browser, talking to APIs, and shipping a real page.",
  outcome: "Build and deploy a small interactive web page that talks to an API",
  tags: ["Web", "Frontend", "Fundamentals"],
  estimatedHours: 8,
  skillNodes: [
    {
      id: "how-web-works",
      title: "How the Web Works",
      description: "DNS, HTTP requests and responses, and the client/server model.",
      prereqIds: [],
      lessonIds: ["web-l1"],
      position: { col: 0, row: 1 },
    },
    {
      id: "html-structure",
      title: "HTML & Structure",
      description: "Mark up content with semantic HTML.",
      prereqIds: ["how-web-works"],
      lessonIds: ["web-l2"],
      position: { col: 1, row: 0 },
    },
    {
      id: "css-styling",
      title: "CSS & Layout",
      description: "Style and lay out a page with CSS.",
      prereqIds: ["html-structure"],
      lessonIds: ["web-l3"],
      position: { col: 2, row: 0 },
    },
    {
      id: "js-browser",
      title: "JavaScript in the Browser",
      description: "Make pages interactive with JavaScript and the DOM.",
      prereqIds: ["html-structure"],
      lessonIds: ["web-l4"],
      position: { col: 2, row: 2 },
    },
    {
      id: "frontend-backend",
      title: "Frontend vs. Backend",
      description: "Where code runs and who is responsible for what.",
      prereqIds: ["how-web-works"],
      lessonIds: ["web-l5"],
      position: { col: 1, row: 2 },
    },
    {
      id: "apis-json",
      title: "APIs, JSON & REST",
      description: "Fetch and send data over HTTP with a real API.",
      prereqIds: ["js-browser", "frontend-backend"],
      lessonIds: ["web-l6"],
      position: { col: 3, row: 1 },
    },
    {
      id: "deploying",
      title: "Deploying a Site",
      description: "Get your page onto the public internet.",
      prereqIds: ["css-styling", "apis-json"],
      lessonIds: ["web-l7"],
      position: { col: 4, row: 1 },
    },
  ],
  lessons: [
    {
      id: "web-l1",
      title: "What happens when you visit a URL",
      description: "DNS, the request/response cycle, and status codes.",
      skillNodeId: "how-web-works",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "web-l1-a1",
          title: "DNS and the request/response cycle",
          skillNodeId: "how-web-works",
          xp: 10,
          content:
            "When you type `example.com` and hit enter, a chain of steps runs in under a second.\n\nFirst, **DNS** (the Domain Name System) translates the human-friendly name `example.com` into a numeric **IP address** like `93.184.216.34` — DNS is the phone book of the internet. Your browser then opens a connection to that address and sends an **HTTP request**: a method (like `GET`), a path (`/`), and headers describing what it wants.\n\nThe server sends back an **HTTP response**: a **status code**, headers, and usually a body (the HTML). The browser reads the HTML, discovers it needs more files — CSS, JavaScript, images — and makes further requests for each. This **client/server** model is the foundation of the whole web: your browser (the client) asks, a server answers.",
          questions: [
            {
              id: "q1",
              prompt: "What does DNS do?",
              options: [
                { id: "a", text: "Translates a domain name into the IP address of a server" },
                { id: "b", text: "Encrypts the connection between browser and server" },
                { id: "c", text: "Stores your browsing history" },
              ],
              correctOptionId: "a",
              explanation:
                "DNS resolves human-readable names like example.com into the numeric IP addresses computers use to reach each other.",
            },
            {
              id: "q2",
              prompt: "In the client/server model, which role does your web browser play?",
              options: [
                { id: "a", text: "The client — it sends requests and displays responses" },
                { id: "b", text: "The server — it stores and serves the website's files" },
                { id: "c", text: "Neither; the browser only renders local files" },
              ],
              correctOptionId: "a",
              explanation:
                "The browser is the client: it initiates requests to servers and renders whatever they return.",
            },
          ],
        },
        {
          type: "explanation_check",
          id: "web-l1-a2",
          title: "Reading HTTP status codes",
          skillNodeId: "how-web-works",
          xp: 10,
          content:
            "Every HTTP response carries a three-digit **status code** grouped by its first digit. **2xx** means success (`200 OK`). **3xx** means redirection (`301 Moved Permanently`). **4xx** means the *client* made a mistake — `404 Not Found` (no such page), `401 Unauthorized`, `403 Forbidden`. **5xx** means the *server* failed while handling a valid request — `500 Internal Server Error`, `503 Service Unavailable`.\n\nThe 4xx-vs-5xx distinction is the one to internalize: a 4xx points at the request (wrong URL, missing credentials), while a 5xx points at the server-side code or infrastructure. Knowing which side to look at first saves real debugging time.",
          questions: [
            {
              id: "q1",
              prompt: "Your app calls an API and gets a `500` response. Where should you look first?",
              options: [
                { id: "a", text: "The server side — a 5xx means the server failed handling the request" },
                { id: "b", text: "The client request — a 5xx means you sent a malformed URL" },
                { id: "c", text: "DNS — a 5xx means the domain didn't resolve" },
              ],
              correctOptionId: "a",
              explanation:
                "5xx codes indicate a server-side failure. The request may be perfectly valid; the problem is in the server's handling of it.",
            },
            {
              id: "q2",
              prompt: "Which status code family indicates the client sent something wrong, like a bad URL or missing login?",
              options: [
                { id: "a", text: "4xx" },
                { id: "b", text: "2xx" },
                { id: "c", text: "3xx" },
              ],
              correctOptionId: "a",
              explanation:
                "4xx codes are client errors — 404 (not found), 401 (unauthorized), 403 (forbidden) all point at the request, not the server.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "web-l1-a3",
          title: "The page won't load",
          skillNodeId: "how-web-works",
          xp: 15,
          scenario:
            "A teammate says your internal tool 'is down.' Their browser shows 'server IP address could not be found.' Before anyone touches the application code, what's the most likely layer to check?",
          choices: [
            {
              id: "a",
              text: "DNS — the name isn't resolving to an address, so the request never reaches the server",
              outcome:
                "You check DNS and find the domain's record expired. The app itself was fine the whole time.",
              rationale:
                "'IP address could not be found' is a resolution failure — the browser never got an address to connect to, so the problem is DNS, not the app.",
              correct: true,
            },
            {
              id: "b",
              text: "The application code — it must be crashing on startup",
              outcome:
                "You dig through healthy application logs for an hour, finding nothing wrong, because the request never arrived.",
              rationale:
                "A DNS resolution error means no request reached the server. Debugging app code first skips past the layer that actually failed.",
              correct: false,
            },
            {
              id: "c",
              text: "The database — it's probably rejecting connections",
              outcome:
                "The database is healthy; it was never queried, because nothing reached the server.",
              rationale:
                "If the name can't resolve, nothing downstream (server, database) was even involved yet. Start at the failing layer.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "web-l2",
      title: "Structuring content with HTML",
      description: "Elements, semantics, and why structure matters.",
      skillNodeId: "html-structure",
      estimatedMinutes: 14,
      activities: [
        {
          type: "explanation_check",
          id: "web-l2-a1",
          title: "Semantic HTML",
          skillNodeId: "html-structure",
          xp: 10,
          content:
            "HTML describes the **structure and meaning** of content using **elements** written as tags: `<h1>` for a top-level heading, `<p>` for a paragraph, `<a>` for a link, `<ul>`/`<li>` for a list, `<button>` for a button.\n\n**Semantic HTML** means choosing the element that matches the *meaning* of the content, not just its appearance. A navigation bar goes in `<nav>`, the main content in `<main>`, an article in `<article>`. This isn't pedantry: screen readers, search engines, and browser features all rely on that meaning. A `<button>` is focusable and keyboard-operable for free; a `<div>` styled to look like a button is not, unless you rebuild all of that by hand.\n\nThe rule: pick the element for what the content *is*, and use CSS for how it *looks*.",
          questions: [
            {
              id: "q1",
              prompt: "Why prefer a real `<button>` element over a `<div>` styled to look like a button?",
              options: [
                { id: "a", text: "The <button> is keyboard-focusable and accessible to screen readers by default" },
                { id: "b", text: "A <div> cannot be styled to look like a button" },
                { id: "c", text: "The <button> element loads faster than a <div>" },
              ],
              correctOptionId: "a",
              explanation:
                "Native semantic elements come with built-in accessibility and keyboard behavior. Recreating that on a <div> is extra work that's easy to get wrong.",
            },
            {
              id: "q2",
              prompt: "What is HTML primarily responsible for?",
              options: [
                { id: "a", text: "The structure and meaning of content" },
                { id: "b", text: "The colors, spacing, and fonts of a page" },
                { id: "c", text: "Handling button clicks and user interaction" },
              ],
              correctOptionId: "a",
              explanation:
                "HTML defines structure and meaning; CSS handles appearance and JavaScript handles interaction. Keeping those roles separate keeps a page maintainable.",
            },
          ],
        },
        {
          type: "applied_task",
          id: "web-l2-a2",
          title: "Mark up a small page",
          skillNodeId: "html-structure",
          xp: 20,
          prompt:
            "You're structuring a simple profile page. Check off each choice that reflects good, semantic HTML structure.",
          submissionType: "checklist",
          checklist: [
            { id: "c1", text: "A single <h1> for the page's main title, with <h2> for subsections" },
            { id: "c2", text: "Navigation links wrapped in a <nav> element" },
            { id: "c3", text: "The primary content inside a <main> element" },
            { id: "c4", text: "Clickable actions using <button> or <a>, not styled <div>s" },
            { id: "c5", text: "Images given descriptive alt text for screen readers" },
          ],
          successFeedback:
            "That's well-structured, accessible HTML: a clear heading hierarchy, meaningful landmarks, real interactive elements, and described images.",
          reviewFeedback:
            "Each item reflects semantics over appearance. Skipping alt text or overusing <div>s produces a page that looks fine but is hard to navigate for assistive tech and search engines.",
        },
        {
          type: "scenario_decision",
          id: "web-l2-a3",
          title: "Heading hierarchy",
          skillNodeId: "html-structure",
          xp: 15,
          scenario:
            "A teammate made a subsection title bigger by using an `<h1>` instead of an `<h2>`, because `<h1>` 'looked the right size.' Now the page has three `<h1>`s. Why is this worth fixing?",
          choices: [
            {
              id: "a",
              text: "Headings convey document structure to assistive tech and search engines; pick the level for meaning and use CSS for size",
              outcome:
                "You change the extra headings to <h2>/<h3> and set the font size in CSS. The page looks identical and now has a coherent outline.",
              rationale:
                "Heading levels form a document outline that screen readers and search engines depend on. Size is a styling concern — set it in CSS, not by misusing heading levels.",
              correct: true,
            },
            {
              id: "b",
              text: "It's fine — as long as it looks right, the heading level doesn't matter",
              outcome:
                "Screen-reader users get a confusing outline with three 'top-level' headings, and the visual size could have been set in CSS anyway.",
              rationale:
                "Appearance and semantics are different concerns. Choosing a heading level for its default size breaks the document structure others rely on.",
              correct: false,
            },
            {
              id: "c",
              text: "Fix it by removing all headings and using bold <div>s sized in CSS",
              outcome:
                "Now there's no heading structure at all, which is worse — assistive tech can't navigate by heading anymore.",
              rationale:
                "Throwing out headings entirely destroys the outline. The right fix is correct heading levels plus CSS for size.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "web-l3",
      title: "Styling and layout with CSS",
      description: "Selectors, the box model, and modern layout.",
      skillNodeId: "css-styling",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "web-l3-a1",
          title: "Selectors and the box model",
          skillNodeId: "css-styling",
          xp: 10,
          content:
            "CSS controls appearance by pairing **selectors** with **declarations**. A selector picks elements (`.card` targets everything with `class=\"card\"`; `nav a` targets links inside a nav), and declarations set properties (`color: navy;`).\n\nEvery element is a **box**, and the **box model** describes its size from the inside out: **content**, then **padding** (space inside the box, around the content), then **border**, then **margin** (space outside the box, between it and its neighbors). Confusing padding and margin is the single most common early CSS bug — padding pushes content away from the box's own edge; margin pushes other elements away.\n\nWhen two rules target the same element, **specificity** decides which wins: a more specific selector (an id, or several classes) beats a less specific one, and ties break in favor of whichever rule comes later.",
          questions: [
            {
              id: "q1",
              prompt: "What's the difference between padding and margin?",
              options: [
                { id: "a", text: "Padding is space inside the element's box; margin is space outside it, between elements" },
                { id: "b", text: "Padding is for text; margin is for images" },
                { id: "c", text: "They are two names for the same thing" },
              ],
              correctOptionId: "a",
              explanation:
                "Padding sits between the content and the border (inside the box); margin sits outside the border, separating the box from its neighbors.",
            },
            {
              id: "q2",
              prompt: "Two CSS rules set a different color on the same element. Which wins?",
              options: [
                { id: "a", text: "The one with higher specificity; if specificity ties, the later rule" },
                { id: "b", text: "Whichever rule is physically shorter" },
                { id: "c", text: "The first rule written always wins" },
              ],
              correctOptionId: "a",
              explanation:
                "CSS resolves conflicts by specificity first (ids beat classes beat element selectors), and by source order when specificity is equal.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "web-l3-a2",
          title: "Building a responsive layout",
          skillNodeId: "css-styling",
          xp: 15,
          scenario:
            "You need a row of three cards that sits side by side on wide screens and stacks vertically on phones. You want to write layout code that adapts without hard-coding pixel widths for every screen size. What's the modern approach?",
          choices: [
            {
              id: "a",
              text: "Use Flexbox or CSS Grid with relative units, and a media query to change the layout at smaller widths",
              outcome:
                "The cards flow in a row on desktop and stack on mobile, with the browser handling the in-between sizes gracefully.",
              rationale:
                "Flexbox/Grid plus relative units and media queries is the standard, maintainable way to build responsive layouts — the browser does the arithmetic.",
              correct: true,
            },
            {
              id: "b",
              text: "Position every card with absolute pixel coordinates for a 1920px-wide screen",
              outcome:
                "It looks perfect on your monitor and breaks on every other screen size, overlapping badly on phones.",
              rationale:
                "Absolute pixel positioning assumes one screen size. Real users have thousands of sizes; responsive layout tools exist precisely to avoid this.",
              correct: false,
            },
            {
              id: "c",
              text: "Detect the device with JavaScript and swap in a completely separate stylesheet per phone model",
              outcome:
                "You drown in per-device special cases that break with every new phone, reinventing what CSS layout already does.",
              rationale:
                "Per-device branching is unmaintainable and unnecessary. Responsive CSS adapts fluidly to any width without enumerating devices.",
              correct: false,
            },
          ],
        },
        {
          type: "applied_task",
          id: "web-l3-a3",
          title: "Center content in a container",
          skillNodeId: "css-styling",
          xp: 15,
          prompt:
            "You have a container element and want to center its child both horizontally and vertically using Flexbox. Write the three CSS declarations you'd put on the container (as a single block, e.g. `display: ...; justify-content: ...; align-items: ...;`).",
          submissionType: "command",
          expectedPatterns: ["display\\s*:\\s*flex", "justify-content\\s*:\\s*center", "align-items\\s*:\\s*center"],
          successFeedback:
            "Exactly — `display: flex` turns on Flexbox, `justify-content: center` centers along the main (horizontal) axis, and `align-items: center` centers along the cross (vertical) axis.",
          reviewFeedback:
            "We were looking for `display: flex; justify-content: center; align-items: center;`. Flexbox centering needs all three: turn on flex, then center on both axes.",
        },
      ],
    },
    {
      id: "web-l4",
      title: "JavaScript and the DOM",
      description: "Make a page respond to the user.",
      skillNodeId: "js-browser",
      estimatedMinutes: 16,
      activities: [
        {
          type: "explanation_check",
          id: "web-l4-a1",
          title: "The DOM and events",
          skillNodeId: "js-browser",
          xp: 10,
          content:
            "When the browser parses your HTML, it builds a live in-memory tree of objects called the **DOM** (Document Object Model). JavaScript running in the page can read and change that tree — find an element (`document.querySelector('.total')`), change its text, add a class, create new elements — and the page updates instantly.\n\nInteraction works through **events**. You register a listener — \"when this button is clicked, run this function\" — with `element.addEventListener('click', handler)`. The browser calls your handler whenever the event fires. This is the loop behind every interactive page: an event happens, your code runs, it updates the DOM, the user sees the result.\n\nJavaScript in the browser is also **event-driven and single-threaded**: slow work (like waiting for a network response) must be done **asynchronously** so it doesn't freeze the page while it waits.",
          questions: [
            {
              id: "q1",
              prompt: "What is the DOM?",
              options: [
                { id: "a", text: "A live in-memory tree of the page that JavaScript can read and modify" },
                { id: "b", text: "The server that hosts the website's files" },
                { id: "c", text: "A file format for storing CSS rules" },
              ],
              correctOptionId: "a",
              explanation:
                "The DOM is the browser's object representation of the parsed HTML. Changing the DOM changes what the user sees.",
            },
            {
              id: "q2",
              prompt: "How does your code react to a user clicking a button?",
              options: [
                { id: "a", text: "Register an event listener for 'click' that runs a handler function" },
                { id: "b", text: "Poll the button 60 times a second to check if it moved" },
                { id: "c", text: "Reload the entire page on every possible click" },
              ],
              correctOptionId: "a",
              explanation:
                "addEventListener registers a handler the browser calls when the event fires — the standard event-driven model.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "web-l4-a2",
          title: "The page freezes",
          skillNodeId: "js-browser",
          xp: 15,
          scenario:
            "A page you're building fetches data from a slow API. While it waits, the whole page becomes unresponsive — clicks and scrolling stop working until the data arrives. What's the underlying cause and fix?",
          choices: [
            {
              id: "a",
              text: "The fetch is being handled in a way that blocks the single thread; do the network work asynchronously (async/await or promises) so the page stays responsive",
              outcome:
                "You switch to an async fetch and await the result. The page stays interactive while the request is in flight, then updates when data returns.",
              rationale:
                "Browser JavaScript is single-threaded, so blocking work freezes everything. Asynchronous network calls let the page keep responding while waiting.",
              correct: true,
            },
            {
              id: "b",
              text: "The API is too slow; the only fix is to buy a faster server",
              outcome:
                "Even on a faster server the page still freezes on any request that isn't instant, because the blocking pattern is unchanged.",
              rationale:
                "The freeze comes from blocking the thread, not from the server's speed. Async handling fixes the responsiveness regardless of latency.",
              correct: false,
            },
            {
              id: "c",
              text: "Add more event listeners so the page has more chances to respond",
              outcome:
                "Extra listeners can't run either — the single thread is still blocked, so nothing responds until the wait finishes.",
              rationale:
                "More listeners don't help when the one thread is blocked. The fix is to stop blocking it, via asynchronous code.",
              correct: false,
            },
          ],
        },
        {
          type: "applied_task",
          id: "web-l4-a3",
          title: "Wire up a click handler",
          skillNodeId: "js-browser",
          xp: 20,
          prompt:
            "You have a button in a variable called `btn`. Write a line of JavaScript that runs a function when the button is clicked, logging `\"clicked\"` to the console. (Use addEventListener.)",
          submissionType: "command",
          expectedPatterns: ["btn\\.addEventListener\\s*\\(\\s*['\"]click['\"]", "console\\.log"],
          successFeedback:
            "That's the pattern: `btn.addEventListener('click', () => console.log('clicked'))`. The browser calls your function every time the click event fires.",
          reviewFeedback:
            "A working version is `btn.addEventListener('click', () => console.log('clicked'))`. You need addEventListener with the 'click' event and a handler function that logs.",
        },
      ],
    },
    {
      id: "web-l5",
      title: "Frontend, backend, and where code runs",
      description: "The split between the browser and the server.",
      skillNodeId: "frontend-backend",
      estimatedMinutes: 13,
      activities: [
        {
          type: "explanation_check",
          id: "web-l5-a1",
          title: "Two sides of a web app",
          skillNodeId: "frontend-backend",
          xp: 10,
          content:
            "A web app has two sides. The **frontend** runs in the user's browser: HTML, CSS, and JavaScript that the user can view, and ultimately *can't be trusted* — anyone can open dev tools and change it. The **backend** runs on a server you control: it holds the database, enforces business rules, and does anything that must be trustworthy or secret.\n\nThe boundary matters most for **security**. A price check, a permission check, or a payment must happen on the backend, because the frontend can be tampered with. A common beginner mistake is to enforce a rule only in the browser — like disabling a button — and assume that's enough. It isn't: an attacker can send the request directly, bypassing your UI entirely.\n\nSecrets follow the same logic. Anything shipped to the browser is public. API keys that grant real power belong on the backend, never in frontend JavaScript.",
          questions: [
            {
              id: "q1",
              prompt: "Where must a security check like 'is this user allowed to delete this record?' be enforced?",
              options: [
                { id: "a", text: "On the backend — the frontend can be tampered with and bypassed" },
                { id: "b", text: "On the frontend — it's closer to the user and faster" },
                { id: "c", text: "Either one; they're equally trustworthy" },
              ],
              correctOptionId: "a",
              explanation:
                "The frontend is fully controllable by the user, so authorization must be enforced on the backend where the user can't alter the code.",
            },
            {
              id: "q2",
              prompt: "Why should a powerful secret API key never live in frontend JavaScript?",
              options: [
                { id: "a", text: "Anything shipped to the browser is visible to anyone, so the key would be public" },
                { id: "b", text: "Frontend JavaScript can't read strings that long" },
                { id: "c", text: "Browsers automatically delete API keys for safety" },
              ],
              correctOptionId: "a",
              explanation:
                "All frontend code is downloadable and inspectable. A secret in it is exposed to every visitor; secrets belong on the backend.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "web-l5-a2",
          title: "The disabled-button 'security'",
          skillNodeId: "frontend-backend",
          xp: 15,
          scenario:
            "To stop non-admins from deleting posts, a teammate simply hides the delete button for non-admin users in the frontend. Is that sufficient, and if not, what's the fix?",
          choices: [
            {
              id: "a",
              text: "Not sufficient — enforce the permission check on the backend; hiding the button is only a UX nicety",
              outcome:
                "You add a server-side check that rejects delete requests from non-admins. Now the rule holds even if someone sends the request directly.",
              rationale:
                "Hiding UI is cosmetic. A non-admin can still send the delete request by hand; only a backend check actually enforces the rule.",
              correct: true,
            },
            {
              id: "b",
              text: "Sufficient — if the button isn't visible, no one can trigger the action",
              outcome:
                "An attacker opens dev tools, finds the delete endpoint, and calls it directly. Posts get deleted despite the hidden button.",
              rationale:
                "The frontend can't stop a crafted request. Anything not enforced on the backend can be bypassed.",
              correct: false,
            },
            {
              id: "c",
              text: "Sufficient if you also rename the endpoint to something hard to guess",
              outcome:
                "The endpoint name leaks in network traffic the moment any admin uses it, and the check still isn't enforced server-side.",
              rationale:
                "Obscurity isn't security. The endpoint is discoverable, and without a backend check the action stays open to abuse.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "web-l6",
      title: "Talking to APIs with JSON",
      description: "Fetch data, read JSON, and understand REST.",
      skillNodeId: "apis-json",
      estimatedMinutes: 16,
      activities: [
        {
          type: "explanation_check",
          id: "web-l6-a1",
          title: "JSON and REST",
          skillNodeId: "apis-json",
          xp: 10,
          content:
            "Frontends and backends exchange data most often as **JSON** (JavaScript Object Notation) — a text format of key/value pairs, arrays, strings, numbers, and booleans that both sides can read. `{ \"id\": 7, \"name\": \"Ada\" }` is JSON.\n\nMany web APIs follow **REST**, a style that maps **HTTP methods** to actions on **resources** (things like users or posts, each with a URL). `GET /users/7` reads a user, `POST /users` creates one, `PUT`/`PATCH /users/7` updates, `DELETE /users/7` removes. A key idea is that `GET` should be **safe** — it only reads, never changes data — while `POST`, `PUT`, and `DELETE` modify state. That's why a browser can safely prefetch `GET` links but should never auto-fire a `DELETE`.\n\nIn the browser you make these calls with `fetch`, and the response arrives asynchronously — you await it, check the status, and parse the JSON body.",
          questions: [
            {
              id: "q1",
              prompt: "In a REST API, which HTTP method would you use to fetch an existing user without changing anything?",
              options: [
                { id: "a", text: "GET" },
                { id: "b", text: "DELETE" },
                { id: "c", text: "POST" },
              ],
              correctOptionId: "a",
              explanation:
                "GET reads a resource and is expected to be safe (no side effects). POST creates, DELETE removes, and both change state.",
            },
            {
              id: "q2",
              prompt: "What is JSON?",
              options: [
                { id: "a", text: "A text data format of key/value pairs and arrays that both frontend and backend can read" },
                { id: "b", text: "A programming language that replaces JavaScript" },
                { id: "c", text: "A type of database server" },
              ],
              correctOptionId: "a",
              explanation:
                "JSON is a lightweight, language-neutral text format for structured data — the common tongue for API request and response bodies.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "web-l6-a2",
          title: "The request that silently fails",
          skillNodeId: "apis-json",
          xp: 15,
          scenario:
            "Your code does `const data = await fetch(url).then(r => r.json())` and immediately uses `data`. Usually it works, but sometimes the app shows garbage or crashes. You notice it happens when the API returns a 404 or 500. What's the flaw?",
          choices: [
            {
              id: "a",
              text: "The code never checks the response status; on an error it tries to parse an error body as if it were valid data",
              outcome:
                "You add a check on `response.ok` (or the status) before parsing, and handle errors explicitly. The crashes stop.",
              rationale:
                "fetch doesn't throw on 4xx/5xx — it resolves with an error response. You must check the status and handle failures, not assume every response is good data.",
              correct: true,
            },
            {
              id: "b",
              text: "The API is returning JSON too slowly; add a longer timeout and it'll be fine",
              outcome:
                "Timeouts don't touch the real bug — an error response is still parsed as data whenever the API returns 404 or 500.",
              rationale:
                "The problem is unhandled error statuses, not latency. A timeout change leaves the app crashing on every error response.",
              correct: false,
            },
            {
              id: "c",
              text: "JSON parsing is unreliable; switch to reading the response as plain text and hope it's usable",
              outcome:
                "Now you have text you can't easily use, and you still haven't distinguished success from error responses.",
              rationale:
                "JSON parsing isn't the issue; not checking whether the request succeeded is. Handle the status first, then parse.",
              correct: false,
            },
          ],
        },
        {
          type: "applied_task",
          id: "web-l6-a3",
          title: "Fetch and parse JSON safely",
          skillNodeId: "apis-json",
          xp: 20,
          prompt:
            "Write an async snippet that fetches `/api/users`, checks whether the response was OK before parsing, and parses the JSON body. Include the `fetch` call, a check on the response (e.g. `response.ok`), and a `.json()` parse. (A few lines of JavaScript.)",
          submissionType: "command",
          expectedPatterns: ["fetch\\s*\\(\\s*['\"]/api/users['\"]", "\\.ok", "\\.json\\s*\\(\\s*\\)"],
          successFeedback:
            "Good — you fetch, guard on `response.ok` before trusting the body, then parse with `.json()`. That's the safe pattern: never parse a response you haven't confirmed succeeded.",
          reviewFeedback:
            "We looked for a `fetch('/api/users')`, a check on `response.ok`, and a `.json()` parse. The key lesson: check the status before parsing, because fetch doesn't throw on HTTP errors.",
        },
      ],
    },
    {
      id: "web-l7",
      title: "Deploying your site",
      description: "From your machine to the public internet.",
      skillNodeId: "deploying",
      estimatedMinutes: 14,
      activities: [
        {
          type: "explanation_check",
          id: "web-l7-a1",
          title: "Static hosting, domains, and HTTPS",
          skillNodeId: "deploying",
          xp: 10,
          content:
            "A simple site of HTML, CSS, and JavaScript is a set of **static files** — no server-side code needs to run to serve them. **Static hosting** platforms take those files and serve them from servers close to your users, often via a **CDN** (content delivery network) that caches copies worldwide so pages load fast everywhere.\n\nTo make the site reachable by name, you point a **domain** at the host by configuring its DNS records. And you serve it over **HTTPS** — HTTP with encryption — so traffic between browser and server can't be read or tampered with in transit. HTTPS is effectively mandatory today: browsers flag plain HTTP as 'Not Secure,' and many browser features refuse to run without it. Reputable hosts provision the necessary certificate automatically.\n\nThe modern flow ties it together: push your code to a repository, and the host builds and deploys the new version automatically — deployment becomes a `git push`.",
          questions: [
            {
              id: "q1",
              prompt: "Why serve even a simple personal site over HTTPS rather than plain HTTP?",
              options: [
                { id: "a", text: "It encrypts traffic so it can't be read or altered in transit, and browsers now expect it" },
                { id: "b", text: "HTTPS makes the HTML files smaller" },
                { id: "c", text: "Plain HTTP can't serve images" },
              ],
              correctOptionId: "a",
              explanation:
                "HTTPS protects data in transit and is the expected default — browsers warn on plain HTTP and gate features behind HTTPS.",
            },
            {
              id: "q2",
              prompt: "What does a CDN do for a static site?",
              options: [
                { id: "a", text: "Caches copies of the files on servers around the world so they load quickly for distant users" },
                { id: "b", text: "Compiles your JavaScript into a faster language" },
                { id: "c", text: "Stores your database records" },
              ],
              correctOptionId: "a",
              explanation:
                "A CDN distributes cached copies geographically, cutting latency by serving each user from a nearby location.",
            },
          ],
        },
        {
          type: "applied_task",
          id: "web-l7-a2",
          title: "Ship a static site",
          skillNodeId: "deploying",
          xp: 20,
          prompt:
            "You're deploying your first static site to a hosting platform. Check off each step that belongs in a responsible first deployment.",
          submissionType: "checklist",
          checklist: [
            { id: "c1", text: "Put the site's source in a git repository" },
            { id: "c2", text: "Connect the repo to a static host that builds and deploys on push" },
            { id: "c3", text: "Confirm the site is served over HTTPS" },
            { id: "c4", text: "Point a domain at the host by updating its DNS records" },
            { id: "c5", text: "Verify no secret keys are present in the deployed frontend files" },
          ],
          successFeedback:
            "That's a clean first deploy: version-controlled source, automatic deploys on push, HTTPS, a real domain, and no secrets leaked to the browser.",
          reviewFeedback:
            "Every item counts. Skipping the secrets check can expose credentials publicly; skipping HTTPS gets your site flagged 'Not Secure'; connecting the repo is what makes future deploys a simple push.",
        },
        {
          type: "scenario_decision",
          id: "web-l7-a3",
          title: "Old version still showing",
          skillNodeId: "deploying",
          xp: 15,
          scenario:
            "You deploy an update, but visitors (and your own browser) keep seeing the old page. The deployment logs show it succeeded. What's the most likely explanation to check first?",
          choices: [
            {
              id: "a",
              text: "Caching — the browser or CDN is serving a cached copy; verify with a hard refresh and check the cache settings",
              outcome:
                "A hard refresh shows the new page. You review cache headers so future updates propagate predictably.",
              rationale:
                "Successful deploys that still show old content almost always point to caching at the browser or CDN. That's the first thing to rule out.",
              correct: true,
            },
            {
              id: "b",
              text: "The deployment must have secretly failed despite the success logs; redeploy repeatedly until it works",
              outcome:
                "Repeated redeploys change nothing, because the new files are already live — they're just being served from cache.",
              rationale:
                "The logs say it succeeded and the files are live. Redeploying doesn't clear a cache that's serving the old copy.",
              correct: false,
            },
            {
              id: "c",
              text: "DNS is broken; move the domain to a different host",
              outcome:
                "The site loads fine (you're reaching it), just with cached content — DNS is clearly working, and moving hosts is a huge overreaction.",
              rationale:
                "If you can load the site at all, DNS resolved. A stale page is a caching symptom, not a DNS failure.",
              correct: false,
            },
          ],
        },
      ],
    },
  ],
};

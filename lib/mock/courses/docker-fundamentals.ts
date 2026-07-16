import type { CourseContent } from "@/lib/types";

/**
 * Flagship seed course. Lesson "docker-l1" is the fully-authored showcase
 * lesson containing every activity type.
 */
export const dockerFundamentals: CourseContent = {
  contentId: "content-docker-fundamentals",
  title: "Docker Fundamentals",
  description:
    "Go from zero to confidently containerizing real applications: containers, images, volumes, networking, and Compose.",
  outcome: "Containerize and run a real multi-service application locally",
  tags: ["DevOps", "Docker", "Infrastructure"],
  estimatedHours: 8,
  skillNodes: [
    {
      id: "containers",
      title: "Containers 101",
      description: "What containers are and how to run them.",
      prereqIds: [],
      lessonIds: ["docker-l1", "docker-l2"],
      position: { col: 0, row: 1 },
    },
    {
      id: "images",
      title: "Images & Layers",
      description: "Build images with Dockerfiles and understand layers.",
      prereqIds: ["containers"],
      lessonIds: ["docker-l3"],
      position: { col: 1, row: 0 },
    },
    {
      id: "volumes",
      title: "Volumes & Data",
      description: "Persist data beyond a container's lifetime.",
      prereqIds: ["containers"],
      lessonIds: ["docker-l4"],
      position: { col: 1, row: 2 },
    },
    {
      id: "networking",
      title: "Networking",
      description: "Connect containers to each other and the outside world.",
      prereqIds: ["images"],
      lessonIds: ["docker-l5"],
      position: { col: 2, row: 0 },
    },
    {
      id: "compose",
      title: "Docker Compose",
      description: "Define and run multi-container applications.",
      prereqIds: ["networking", "volumes"],
      lessonIds: ["docker-l6"],
      position: { col: 2, row: 2 },
    },
    {
      id: "capstone",
      title: "Capstone Project",
      description: "Ship a complete multi-service app with Docker.",
      prereqIds: ["compose"],
      lessonIds: ["docker-l7"],
      position: { col: 3, row: 1 },
    },
  ],
  lessons: [
    {
      id: "docker-l1",
      title: "What is a container?",
      description: "The problem containers solve and your first `docker run`.",
      skillNodeId: "containers",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "docker-l1-a1",
          title: "Containers vs. virtual machines",
          skillNodeId: "containers",
          xp: 10,
          content:
            "A **container** packages an application together with everything it needs to run — code, runtime, libraries, and settings — into one isolated unit. Wherever the container runs, the app behaves the same way. That kills the classic \"works on my machine\" problem.\n\nContainers are often compared to **virtual machines**, but they're much lighter. A VM emulates an entire computer, including its own operating system kernel, and takes minutes to boot. A container shares the host machine's kernel and only isolates the application's view of the system — processes, filesystem, and network. Containers start in milliseconds and you can run dozens on a laptop.\n\nThe key mental model: a VM virtualizes *hardware*; a container virtualizes the *operating system*.",
          questions: [
            {
              id: "q1",
              prompt: "Why do containers start so much faster than virtual machines?",
              options: [
                { id: "a", text: "They share the host's OS kernel instead of booting their own" },
                { id: "b", text: "They run on special, faster hardware" },
                { id: "c", text: "They skip loading the application code until first request" },
              ],
              correctOptionId: "a",
              explanation:
                "Containers don't boot an operating system — they share the host kernel and only isolate the app's view of it, so startup is nearly instant.",
            },
            {
              id: "q2",
              prompt: "What problem do containers primarily solve?",
              options: [
                { id: "a", text: "Making applications run faster than on bare metal" },
                { id: "b", text: "Making an app run the same way in every environment" },
                { id: "c", text: "Eliminating the need for an operating system" },
              ],
              correctOptionId: "b",
              explanation:
                "By packaging the app with all of its dependencies, a container behaves identically on your laptop, a teammate's machine, and production.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "docker-l1-a2",
          title: "Debug a crashing container",
          skillNodeId: "containers",
          xp: 15,
          scenario:
            "You deploy a containerized API to a staging server. It worked on your laptop, but on the server the container exits immediately after starting. You have SSH access to the server. What do you check first?",
          choices: [
            {
              id: "a",
              text: "Run `docker logs <container>` to see why the process exited",
              outcome:
                "The logs show `Error: DATABASE_URL is not set`. The container exited because required configuration was missing on the server.",
              rationale:
                "A container exits when its main process exits — the process's own output almost always says why. Logs first, always.",
              correct: true,
            },
            {
              id: "b",
              text: "Rebuild the image from scratch on the server",
              outcome:
                "Twenty minutes later the freshly-built image crashes the same way. The image was never the problem.",
              rationale:
                "Rebuilding is a slow guess. The same image worked locally, so the difference is in the environment, not the build.",
              correct: false,
            },
            {
              id: "c",
              text: "Restart the Docker daemon on the server",
              outcome:
                "The daemon restarts fine, the container still exits immediately. Nothing about the daemon was wrong.",
              rationale:
                "A single container exiting cleanly is app-level behavior, not a daemon issue. Check the process's own output before touching infrastructure.",
              correct: false,
            },
          ],
        },
        {
          type: "applied_task",
          id: "docker-l1-a3",
          title: "Run your first container",
          skillNodeId: "containers",
          xp: 20,
          prompt:
            "Write the Docker command that runs an `nginx` container in the background (detached) and publishes container port 80 to port 8080 on your machine.",
          submissionType: "command",
          expectedPatterns: ["docker\\s+run", "-d", "(-p|--publish)\\s*8080:80", "nginx"],
          successFeedback:
            "That's it — `-d` detaches, `-p 8080:80` maps host port 8080 to container port 80, and `nginx` is the image. Visit localhost:8080 and nginx answers.",
          reviewFeedback:
            "Close, but this doesn't match what we expected. A working version is `docker run -d -p 8080:80 nginx` — check that you detached with `-d` and published the port with `-p 8080:80`.",
        },
        {
          type: "ai_tutor_conversation",
          id: "docker-l1-a4",
          title: "Talk it through with your tutor",
          skillNodeId: "containers",
          xp: 15,
          description:
            "An open conversation with your AI tutor to pressure-test your mental model of containers — ask anything, or let the tutor probe your understanding.",
          sampleMessages: [
            { role: "tutor", text: "You said containers share the host kernel. What does that mean a container *can't* do that a VM can?" },
            { role: "learner", text: "Run a different operating system than the host?" },
            { role: "tutor", text: "Exactly — a Linux host can't run a Windows container natively. So how does Docker Desktop run Linux containers on your Mac?" },
          ],
        },
        {
          type: "spaced_review",
          id: "docker-l1-a5",
          title: "Review: container fundamentals",
          skillNodeId: "containers",
          xp: 10,
          description:
            "A short adaptive review session that resurfaces the concepts from this lesson at increasing intervals, prioritizing anything you missed.",
          reviewItems: [
            "Containers vs. VMs: what's shared, what's isolated",
            "Why containers solve \"works on my machine\"",
            "Reading `docker logs` to diagnose exits",
            "`docker run` flags: -d and -p",
          ],
        },
      ],
    },
    {
      id: "docker-l2",
      title: "Container lifecycle",
      description: "Start, stop, inspect, and clean up containers.",
      skillNodeId: "containers",
      estimatedMinutes: 10,
      activities: [
        {
          type: "explanation_check",
          id: "docker-l2-a1",
          title: "The lifecycle commands",
          skillNodeId: "containers",
          xp: 10,
          content:
            "A container moves through a simple lifecycle: **created → running → stopped → removed**.\n\n`docker ps` lists running containers; add `-a` to include stopped ones. `docker stop` sends a polite shutdown signal (SIGTERM), while `docker kill` force-terminates. A stopped container still exists — its filesystem and logs stick around until you `docker rm` it.\n\nOne habit worth building early: containers are meant to be **disposable**. If a container misbehaves, you don't repair it — you remove it and start a fresh one from the image.",
          questions: [
            {
              id: "q1",
              prompt: "You ran `docker stop api` and now `docker ps` shows nothing. Is the container gone?",
              options: [
                { id: "a", text: "Yes — stopping a container deletes it" },
                { id: "b", text: "No — it still exists; `docker ps -a` will show it" },
                { id: "c", text: "Only its logs remain" },
              ],
              correctOptionId: "b",
              explanation:
                "Stopped containers keep their filesystem and logs until removed with `docker rm`. `docker ps` only shows *running* containers.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "docker-l2-a2",
          title: "Disk space mystery",
          skillNodeId: "containers",
          xp: 15,
          scenario:
            "Your dev machine is nearly out of disk space. You've been experimenting with Docker for weeks — running containers, pulling images, rarely cleaning up. What's the most effective first move?",
          choices: [
            {
              id: "a",
              text: "Run `docker system prune` to clear stopped containers, unused networks, and dangling images",
              outcome: "Docker reclaims 14 GB of stopped containers and dangling images in one command.",
              rationale:
                "`docker system prune` is the standard cleanup for accumulated Docker debris. Add `-a` to also remove unused (not just dangling) images.",
              correct: true,
            },
            {
              id: "b",
              text: "Delete files inside your running containers to free space",
              outcome:
                "You free a few megabytes. The real space is held by weeks of stopped containers and old image layers, which this doesn't touch.",
              rationale:
                "The bulk of Docker disk usage is stopped containers and image layers on the host, not files inside live containers.",
              correct: false,
            },
            {
              id: "c",
              text: "Uninstall and reinstall Docker",
              outcome: "It works, but you also destroyed every image and volume you wanted to keep — including databases.",
              rationale:
                "A full reinstall is a blunt instrument that takes your volumes (real data) with it. Prune first, always.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "docker-l3",
      title: "Images and layers",
      description: "Write a Dockerfile and build an image.",
      skillNodeId: "images",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "docker-l3-a1",
          title: "How images are built",
          skillNodeId: "images",
          xp: 10,
          content:
            "An **image** is the blueprint a container runs from. You define it in a `Dockerfile` — a list of instructions like `FROM node:20`, `COPY . .`, and `RUN npm install`.\n\nEach instruction creates a **layer**, and layers are cached. If nothing an instruction depends on has changed, Docker reuses the cached layer instead of re-running it. That's why Dockerfiles put the things that change least (base image, dependencies) *before* the things that change most (your source code): editing one source file then re-copies your code, but doesn't reinstall every dependency.",
          questions: [
            {
              id: "q1",
              prompt: "Why does a well-written Dockerfile copy `package.json` and run `npm install` *before* copying the rest of the source code?",
              options: [
                { id: "a", text: "So dependency layers stay cached when only source code changes" },
                { id: "b", text: "Because Docker requires dependency files to be copied first" },
                { id: "c", text: "To make the final image smaller" },
              ],
              correctOptionId: "a",
              explanation:
                "Layer caching: if `package.json` hasn't changed, the expensive `npm install` layer is reused, and only the cheap source-copy layer rebuilds.",
            },
          ],
        },
        {
          type: "applied_task",
          id: "docker-l3-a2",
          title: "Build and tag an image",
          skillNodeId: "images",
          xp: 20,
          prompt:
            "You're in a directory containing a Dockerfile. Write the command that builds an image from it and tags the image `myapp:v1`.",
          submissionType: "command",
          expectedPatterns: ["docker\\s+build", "(-t|--tag)\\s*myapp:v1", "\\."],
          successFeedback:
            "`docker build -t myapp:v1 .` — the trailing dot is the build context (the files Docker can see during the build).",
          reviewFeedback:
            "Not quite what we expected. A working version is `docker build -t myapp:v1 .` — the `-t` flag tags the image, and don't forget the `.` build context at the end.",
        },
      ],
    },
    {
      id: "docker-l4",
      title: "Persisting data with volumes",
      description: "Keep data alive across container restarts.",
      skillNodeId: "volumes",
      estimatedMinutes: 12,
      activities: [
        {
          type: "explanation_check",
          id: "docker-l4-a1",
          title: "Why volumes exist",
          skillNodeId: "volumes",
          xp: 10,
          content:
            "A container's filesystem is **ephemeral** — when the container is removed, everything written inside it is gone. That's fine for stateless apps and catastrophic for databases.\n\nA **volume** is storage managed by Docker that lives *outside* any container's lifecycle. You attach it at run time — `docker run -v pgdata:/var/lib/postgresql/data postgres` — and the data survives no matter how many times the container is recreated.\n\nRule of thumb: if losing it would hurt, it belongs in a volume.",
          questions: [
            {
              id: "q1",
              prompt: "Your Postgres container was recreated during an upgrade and all data vanished. What was missing?",
              options: [
                { id: "a", text: "A volume mounted at Postgres's data directory" },
                { id: "b", text: "A backup cron job inside the container" },
                { id: "c", text: "The `--persist` flag on `docker run`" },
              ],
              correctOptionId: "a",
              explanation:
                "Without a volume at `/var/lib/postgresql/data`, the data lived in the container's ephemeral filesystem and was destroyed with it. (There is no `--persist` flag.)",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "docker-l4-a2",
          title: "Bind mount or named volume?",
          skillNodeId: "volumes",
          xp: 15,
          scenario:
            "You're developing a web app in a container and want your source-code edits on the host to appear inside the running container instantly, without rebuilding. What do you reach for?",
          choices: [
            {
              id: "a",
              text: "A bind mount of your project directory into the container",
              outcome:
                "Edits on the host appear in the container immediately — save a file, refresh, see the change.",
              rationale:
                "Bind mounts map a specific host path into the container, which is exactly what live development needs. Named volumes are for data Docker should own (like databases), not for live host files.",
              correct: true,
            },
            {
              id: "b",
              text: "A named volume for the source code",
              outcome:
                "The container sees the volume's contents, not your working directory — your edits on the host never show up inside it.",
              rationale:
                "Named volumes are managed by Docker in its own storage area; they don't track a host directory you're editing.",
              correct: false,
            },
            {
              id: "c",
              text: "Rebuild the image after every edit",
              outcome: "It works, but every save costs you a rebuild-and-restart cycle. Minutes per change.",
              rationale:
                "Rebuilding on every edit throws away the feedback-speed containers can give you in development. That's what bind mounts are for.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "docker-l5",
      title: "Container networking",
      description: "How containers find and talk to each other.",
      skillNodeId: "networking",
      estimatedMinutes: 12,
      activities: [
        {
          type: "explanation_check",
          id: "docker-l5-a1",
          title: "Networks and service discovery",
          skillNodeId: "networking",
          xp: 10,
          content:
            "Containers on the same **user-defined network** can reach each other *by name*: create a network with `docker network create mynet`, run both containers with `--network mynet`, and your API can connect to `postgres:5432` — Docker's built-in DNS resolves the container name.\n\nPublishing ports (`-p 8080:80`) is only for traffic coming from *outside* Docker — your browser, curl on the host. Container-to-container traffic on a shared network doesn't need published ports at all.",
          questions: [
            {
              id: "q1",
              prompt: "Your API container can't reach your database container at `localhost:5432`. Both are running. Why?",
              options: [
                { id: "a", text: "Inside a container, `localhost` means that container itself — not other containers" },
                { id: "b", text: "The database needs to publish port 5432 with -p" },
                { id: "c", text: "Containers can never talk to each other directly" },
              ],
              correctOptionId: "a",
              explanation:
                "Each container has its own network namespace, so `localhost` points at itself. Put both on a user-defined network and connect to the database by its container name instead.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "docker-l5-a2",
          title: "Expose it or not?",
          skillNodeId: "networking",
          xp: 15,
          scenario:
            "You're running a web app container and a Redis container on the same user-defined network. Only the web app should be reachable from the host browser. How do you set up ports?",
          choices: [
            {
              id: "a",
              text: "Publish the web app's port with -p; give Redis no published ports",
              outcome:
                "The browser reaches the app on the published port; the app reaches Redis by name over the shared network; nothing else can touch Redis.",
              rationale:
                "Publish only what the outside world needs. Internal services stay reachable to their peers on the network without any -p flag — smaller attack surface.",
              correct: true,
            },
            {
              id: "b",
              text: "Publish both containers' ports so everything can connect to everything",
              outcome:
                "Everything works — and your unauthenticated Redis is now reachable from every device on your network.",
              rationale:
                "Publishing Redis exposes it to the host and beyond for no benefit. Container-to-container traffic never needed the published port.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "docker-l6",
      title: "Docker Compose",
      description: "Define your whole stack in one file.",
      skillNodeId: "compose",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "docker-l6-a1",
          title: "From commands to a compose file",
          skillNodeId: "compose",
          xp: 10,
          content:
            "Running a real app means several containers with the right networks, volumes, and environment variables — a lot of `docker run` flags to remember. **Docker Compose** replaces all of that with one declarative `compose.yaml` file listing your **services**.\n\n`docker compose up` starts everything: it creates a shared network automatically (services reach each other by service name), creates declared volumes, and starts services in dependency order. `docker compose down` tears it all back down. Your whole stack becomes one file you can commit to git.",
          questions: [
            {
              id: "q1",
              prompt: "In a compose file, how does the `api` service connect to the `db` service?",
              options: [
                { id: "a", text: "Using the hostname `db` — Compose networks services by name automatically" },
                { id: "b", text: "Using `localhost` with a published port" },
                { id: "c", text: "It must discover the db container's IP address at startup" },
              ],
              correctOptionId: "a",
              explanation:
                "Compose puts all services on a shared network with DNS by service name — `db:5432` just works, no published ports or IPs needed.",
            },
          ],
        },
        {
          type: "applied_task",
          id: "docker-l6-a2",
          title: "Plan a compose file",
          skillNodeId: "compose",
          xp: 20,
          prompt:
            "You're converting a two-container app (a Node API and Postgres) to Compose. Check off each element your `compose.yaml` needs before it's production-worthy for local dev.",
          submissionType: "checklist",
          checklist: [
            { id: "c1", text: "An `api` service and a `db` service defined under `services:`" },
            { id: "c2", text: "A named volume mounted at Postgres's data directory" },
            { id: "c3", text: "Database credentials provided via environment variables" },
            { id: "c4", text: "`depends_on` so the API starts after the database" },
            { id: "c5", text: "Only the API's port published to the host" },
          ],
          successFeedback:
            "That's a complete local-dev compose setup: two services, durable data, configured credentials, ordered startup, minimal exposure.",
          reviewFeedback:
            "Walk through each item — every one of these belongs in the file. Miss the volume and your data dies with the container; miss `depends_on` and the API races the database.",
        },
      ],
    },
    {
      id: "docker-l7",
      title: "Capstone: ship a multi-service app",
      description: "Put everything together on a real project.",
      skillNodeId: "capstone",
      estimatedMinutes: 45,
      activities: [
        {
          type: "applied_task",
          id: "docker-l7-a1",
          title: "Containerize the whole stack",
          skillNodeId: "capstone",
          xp: 50,
          prompt:
            "Take any app you've built (or the provided sample repo) and fully containerize it. Check off each milestone as you complete it on your machine.",
          submissionType: "checklist",
          checklist: [
            { id: "c1", text: "Wrote a Dockerfile that builds your app image cleanly" },
            { id: "c2", text: "App runs in a container and is reachable from your browser" },
            { id: "c3", text: "Database runs as a second service with a named volume" },
            { id: "c4", text: "Whole stack starts with a single `docker compose up`" },
            { id: "c5", text: "Stack survives `docker compose down && docker compose up` with data intact" },
          ],
          successFeedback:
            "You just did the real thing — a reproducible, disposable, data-safe local environment. This is the workflow professional teams use daily.",
          reviewFeedback:
            "Keep going until every box is honestly checked — the last item (data surviving a down/up cycle) is the one that catches most people. Revisit the Volumes lesson if it catches you.",
        },
        {
          type: "spaced_review",
          id: "docker-l7-a2",
          title: "Final review: the full picture",
          skillNodeId: "capstone",
          xp: 15,
          description:
            "A comprehensive review session covering the whole course, weighted toward the skills you found hardest.",
          reviewItems: [
            "Container lifecycle and cleanup",
            "Layer caching and Dockerfile ordering",
            "Volumes vs. bind mounts",
            "Service discovery on user-defined networks",
            "Compose file structure",
          ],
        },
      ],
    },
  ],
};

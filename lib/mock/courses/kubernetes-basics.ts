import type { CourseContent } from "@/lib/types";

/**
 * Starter course: container orchestration with Kubernetes. Written as a natural
 * follow-on to Docker Fundamentals in tone, but fully self-contained — all
 * prereqs reference nodes within this course only.
 */
export const kubernetesBasics: CourseContent = {
  contentId: "content-kubernetes-basics",
  title: "Kubernetes Basics",
  description:
    "Move from single containers to orchestration: run, scale, connect, configure, and self-heal containerized apps with Kubernetes.",
  outcome: "Deploy, expose, and operate a containerized app on a Kubernetes cluster",
  tags: ["DevOps", "Kubernetes", "Infrastructure"],
  estimatedHours: 8,
  skillNodes: [
    {
      id: "why-orchestration",
      title: "Why Orchestration",
      description: "The problems Kubernetes solves beyond a single container.",
      prereqIds: [],
      lessonIds: ["k8s-l1"],
      position: { col: 0, row: 1 },
    },
    {
      id: "pods",
      title: "Pods",
      description: "The smallest deployable unit in Kubernetes.",
      prereqIds: ["why-orchestration"],
      lessonIds: ["k8s-l2"],
      position: { col: 1, row: 1 },
    },
    {
      id: "deployments",
      title: "Deployments & ReplicaSets",
      description: "Declare desired state and let Kubernetes maintain it.",
      prereqIds: ["pods"],
      lessonIds: ["k8s-l3"],
      position: { col: 2, row: 0 },
    },
    {
      id: "services-networking",
      title: "Services & Networking",
      description: "Give pods a stable address and load-balance traffic.",
      prereqIds: ["pods"],
      lessonIds: ["k8s-l4"],
      position: { col: 2, row: 2 },
    },
    {
      id: "config-secrets",
      title: "ConfigMaps & Secrets",
      description: "Inject configuration and sensitive values into pods.",
      prereqIds: ["deployments"],
      lessonIds: ["k8s-l5"],
      position: { col: 3, row: 0 },
    },
    {
      id: "kubectl-workflow",
      title: "kubectl Workflows",
      description: "Apply, inspect, and debug from the command line.",
      prereqIds: ["deployments", "services-networking"],
      lessonIds: ["k8s-l6"],
      position: { col: 3, row: 1 },
    },
    {
      id: "health-self-healing",
      title: "Health Checks & Self-Healing",
      description: "Probes, restarts, and how Kubernetes keeps apps alive.",
      prereqIds: ["config-secrets", "kubectl-workflow"],
      lessonIds: ["k8s-l7"],
      position: { col: 4, row: 1 },
    },
  ],
  lessons: [
    {
      id: "k8s-l1",
      title: "Why orchestration exists",
      description: "What breaks when you run containers at scale by hand.",
      skillNodeId: "why-orchestration",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "k8s-l1-a1",
          title: "The gap orchestration fills",
          skillNodeId: "why-orchestration",
          xp: 10,
          content:
            "Running one container by hand is easy. Running dozens across several machines — surviving crashes, node failures, traffic spikes, and rolling updates — is not. That gap is what a **container orchestrator** like **Kubernetes** fills.\n\nInstead of you starting and babysitting containers, you declare the **desired state** — 'I want five replicas of this app running, reachable at this address' — and Kubernetes continuously works to make reality match. If a container crashes, it restarts it. If a whole machine (**node**) dies, it reschedules that machine's work elsewhere. If you ask for more replicas, it schedules them onto nodes with room.\n\nThis is the core mental shift from Docker: you stop issuing imperative 'start this container' commands and start describing the end state you want, letting the system converge on it — and keep it there.",
          questions: [
            {
              id: "q1",
              prompt: "What is the core idea behind how you tell Kubernetes what to run?",
              options: [
                { id: "a", text: "You declare the desired state, and Kubernetes continuously works to match it" },
                { id: "b", text: "You manually start each container and monitor it yourself" },
                { id: "c", text: "You schedule containers to run only at fixed times of day" },
              ],
              correctOptionId: "a",
              explanation:
                "Kubernetes is declarative: you describe the end state (how many replicas, what image, what config) and its controllers keep reality converged on that state.",
            },
            {
              id: "q2",
              prompt: "A single container on one machine crashes at 3am with no orchestrator. What happens?",
              options: [
                { id: "a", text: "It stays down until a human notices and restarts it" },
                { id: "b", text: "Docker automatically moves it to another cloud region" },
                { id: "c", text: "It restarts itself and rebalances traffic across machines" },
              ],
              correctOptionId: "a",
              explanation:
                "Without an orchestrator, nothing restarts or reschedules the container automatically — providing that resilience is exactly why orchestration exists.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "k8s-l1-a2",
          title: "Do you need Kubernetes?",
          skillNodeId: "why-orchestration",
          xp: 15,
          scenario:
            "You're launching a small internal tool: one container, low traffic, one team. A colleague insists you must run it on a multi-node Kubernetes cluster from day one. What's the balanced view?",
          choices: [
            {
              id: "a",
              text: "Kubernetes shines when you need scaling, self-healing, and rolling updates across many containers; for one low-traffic container it may add more operational complexity than value",
              outcome:
                "You start with a simpler deployment and keep Kubernetes in mind for when scale, resilience, or many services actually justify it.",
              rationale:
                "Kubernetes solves real problems of scale and resilience, but it carries operational overhead. Matching the tool to the actual need — not adopting it reflexively — is the mature call.",
              correct: true,
            },
            {
              id: "b",
              text: "Everyone uses Kubernetes, so it's always the right choice regardless of scale",
              outcome:
                "You take on cluster maintenance, networking complexity, and a steep learning curve to run a single container that didn't need any of it.",
              rationale:
                "Popularity isn't a fit assessment. Adopting Kubernetes for a trivial workload spends complexity you get no return on.",
              correct: false,
            },
            {
              id: "c",
              text: "Kubernetes is never worth it; nobody should use orchestration",
              outcome:
                "The moment the tool grows to many services needing scaling and self-healing, you're back to hand-managing containers Kubernetes would handle.",
              rationale:
                "The opposite overcorrection. Orchestration earns its keep at scale; dismissing it entirely ignores the real problems it solves.",
              correct: false,
            },
          ],
        },
        {
          type: "explanation_check",
          id: "k8s-l1-a3",
          title: "Cluster anatomy: control plane and nodes",
          skillNodeId: "why-orchestration",
          xp: 10,
          content:
            "A Kubernetes **cluster** has two kinds of machines. The **control plane** is the brain: it holds the desired state, makes scheduling decisions, and runs the controllers that drive reality toward what you declared. The **worker nodes** are the muscle: they actually run your containers.\n\nYou talk to the control plane's **API server** — usually through the `kubectl` command-line tool — by submitting objects that describe what you want. Controllers then compare desired state to actual state and act on any difference, a loop that runs constantly. This is why Kubernetes can self-heal: the reconciliation loop never stops checking, so a crashed pod or a failed node is noticed and corrected without you intervening.\n\nYou don't need to memorize every control-plane component to start. The essential model: you declare intent to the API server; controllers make it true and keep it true.",
          questions: [
            {
              id: "q1",
              prompt: "What is the role of the control plane versus worker nodes?",
              options: [
                { id: "a", text: "The control plane decides and schedules; worker nodes run the actual containers" },
                { id: "b", text: "The control plane runs the containers; worker nodes just store logs" },
                { id: "c", text: "They are the same thing under two names" },
              ],
              correctOptionId: "a",
              explanation:
                "The control plane holds desired state and makes decisions; worker nodes execute by running the pods scheduled onto them.",
            },
          ],
        },
      ],
    },
    {
      id: "k8s-l2",
      title: "Pods: the basic unit",
      description: "What a pod is and why it isn't quite the same as a container.",
      skillNodeId: "pods",
      estimatedMinutes: 14,
      activities: [
        {
          type: "explanation_check",
          id: "k8s-l2-a1",
          title: "Pods vs. containers",
          skillNodeId: "pods",
          xp: 10,
          content:
            "In Docker, the unit you run is a container. In Kubernetes, the smallest deployable unit is a **pod** — a wrapper around one or more containers that share a network address and storage. Most pods hold a single container; multi-container pods are for tightly-coupled helpers (a 'sidecar' that ships logs, for example) that must live and die together.\n\nThe crucial property: **pods are ephemeral and disposable**. A pod is never healed in place — if it dies, Kubernetes doesn't repair it; it creates a *new* pod to replace it, with a new name and a new IP address. That's why you almost never create bare pods directly for real workloads; you let a higher-level controller (a Deployment) create and replace them for you.\n\nBecause a pod's IP changes every time it's replaced, other parts of your app can't rely on it — which is exactly the problem Services will solve later.",
          questions: [
            {
              id: "q1",
              prompt: "What is a pod?",
              options: [
                { id: "a", text: "The smallest deployable unit in Kubernetes, wrapping one or more containers that share network and storage" },
                { id: "b", text: "A physical server in the cluster" },
                { id: "c", text: "A tool for building container images" },
              ],
              correctOptionId: "a",
              explanation:
                "A pod groups one or more containers that share an IP and storage and are scheduled together as one unit — the atom of Kubernetes deployment.",
            },
            {
              id: "q2",
              prompt: "A pod crashes. How does Kubernetes typically 'fix' it?",
              options: [
                { id: "a", text: "It replaces the pod with a new one (new name and IP), rather than repairing the old one" },
                { id: "b", text: "It repairs the existing pod in place, keeping the same IP forever" },
                { id: "c", text: "It emails an administrator to fix it manually" },
              ],
              correctOptionId: "a",
              explanation:
                "Pods are disposable. Kubernetes replaces a failed pod with a fresh one rather than mending it — which is why pod IPs are not stable.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "k8s-l2-a2",
          title: "Hard-coding a pod IP",
          skillNodeId: "pods",
          xp: 15,
          scenario:
            "A developer configures their frontend to reach the backend by the backend pod's current IP address, copied from `kubectl get pod -o wide`. It works today. Why will this break?",
          choices: [
            {
              id: "a",
              text: "Pod IPs are not stable — when the backend pod is replaced, its IP changes and the frontend breaks; use a Service for a stable address instead",
              outcome:
                "The next time the backend pod restarts, the hard-coded IP is dead. You switch to addressing the backend through a Service, which stays constant.",
              rationale:
                "Because pods are disposable and get new IPs when replaced, any hard-coded pod IP is a time bomb. Services exist precisely to provide a stable endpoint.",
              correct: true,
            },
            {
              id: "b",
              text: "It won't break — a pod keeps the same IP for its entire cluster lifetime",
              outcome:
                "The first pod replacement (a crash, a node change, a rollout) hands out a new IP and the frontend can no longer reach the backend.",
              rationale:
                "Pod IPs are explicitly ephemeral. Assuming they're permanent is the exact mistake that causes this outage.",
              correct: false,
            },
            {
              id: "c",
              text: "Fix it by disabling pod restarts so the IP never changes",
              outcome:
                "You'd be turning off self-healing — the whole point of Kubernetes — to preserve a fragile design a Service would fix cleanly.",
              rationale:
                "Suppressing restarts to freeze an IP sacrifices resilience for a workaround. The correct fix is a stable Service address, not a brittle pod.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "k8s-l3",
      title: "Deployments and ReplicaSets",
      description: "Declare how many replicas you want and roll out updates safely.",
      skillNodeId: "deployments",
      estimatedMinutes: 16,
      activities: [
        {
          type: "explanation_check",
          id: "k8s-l3-a1",
          title: "Desired state and rolling updates",
          skillNodeId: "deployments",
          xp: 10,
          content:
            "A **Deployment** is the object you actually use to run an app. You declare an image and a **replica count** — say, 'run 3 replicas of `myapp:v2`' — and the Deployment creates a **ReplicaSet** that ensures exactly that many pods exist. If a pod dies, the ReplicaSet notices the count is short and creates a replacement automatically.\n\nDeployments also manage **rolling updates**. When you change the image to `myapp:v3`, the Deployment brings up new pods and tears down old ones gradually, keeping the app available throughout — never all-down at once. If the new version is broken, `kubectl rollout undo` reverts to the previous version, because the Deployment remembers its rollout history.\n\nThis is declarative scaling and releasing in one object: change the replica count to scale, change the image to release, and Kubernetes handles the choreography.",
          questions: [
            {
              id: "q1",
              prompt: "You set a Deployment's replicas to 3 and one pod crashes. What happens?",
              options: [
                { id: "a", text: "The ReplicaSet sees only 2 pods, notices it's short, and creates a new one to return to 3" },
                { id: "b", text: "The Deployment scales down to 2 permanently" },
                { id: "c", text: "Nothing until you manually recreate the pod" },
              ],
              correctOptionId: "a",
              explanation:
                "The ReplicaSet constantly reconciles actual count to desired count, so a lost pod is automatically replaced to maintain the declared number.",
            },
            {
              id: "q2",
              prompt: "Why does a rolling update keep the app available during a version change?",
              options: [
                { id: "a", text: "New pods are brought up and old ones removed gradually, so some replicas always serve traffic" },
                { id: "b", text: "It takes the whole app down, updates, then brings it all back at once" },
                { id: "c", text: "It updates the image without ever creating new pods" },
              ],
              correctOptionId: "a",
              explanation:
                "A rolling update replaces pods incrementally, keeping a healthy subset serving traffic the entire time rather than causing a full outage.",
            },
          ],
        },
        {
          type: "applied_task",
          id: "k8s-l3-a2",
          title: "Scale a deployment",
          skillNodeId: "deployments",
          xp: 15,
          prompt:
            "Traffic is rising and you want to scale a Deployment named `web` up to 5 replicas from the command line. Write the `kubectl` command. (The declarative way is editing the manifest, but write the quick imperative scale command here.)",
          submissionType: "command",
          expectedPatterns: ["kubectl\\s+scale", "deployment", "(--replicas=?\\s*5|replicas=5)", "web"],
          successFeedback:
            "`kubectl scale deployment web --replicas=5` tells Kubernetes the new desired count; the ReplicaSet schedules two more pods to reach 5.",
          reviewFeedback:
            "A working version is `kubectl scale deployment web --replicas=5`. You need `kubectl scale`, the `deployment` kind, the name `web`, and `--replicas=5`.",
        },
        {
          type: "scenario_decision",
          id: "k8s-l3-a3",
          title: "A bad rollout in production",
          skillNodeId: "deployments",
          xp: 15,
          scenario:
            "You update a Deployment to a new image. The rollout proceeds, but the new pods crash on startup and users start seeing errors. What's the fastest safe recovery?",
          choices: [
            {
              id: "a",
              text: "Run `kubectl rollout undo` to revert the Deployment to the previous working revision, then investigate the bad image",
              outcome:
                "Kubernetes rolls back to the last good version and the errors clear. You debug the broken image without an active outage.",
              rationale:
                "Deployments keep rollout history precisely so you can revert instantly. Undo first to restore service, then diagnose the bad image calmly.",
              correct: true,
            },
            {
              id: "b",
              text: "Delete the whole Deployment and recreate it from scratch under pressure",
              outcome:
                "You cause a full outage while recreating everything by hand, when a one-line rollback would have restored the working version in seconds.",
              rationale:
                "Deleting the Deployment throws away the very rollout history that enables a clean, fast revert. It's slower and riskier than `rollout undo`.",
              correct: false,
            },
            {
              id: "c",
              text: "Leave the crashing pods up and SSH into each one to hand-patch the image",
              outcome:
                "Pods are disposable and get replaced; any in-place patch is lost on the next restart, and users keep hitting errors meanwhile.",
              rationale:
                "Hand-patching ephemeral pods fights the platform and doesn't stop the outage. Roll back to a known-good revision instead.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "k8s-l4",
      title: "Services and networking",
      description: "Give a set of pods one stable address.",
      skillNodeId: "services-networking",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "k8s-l4-a1",
          title: "What a Service provides",
          skillNodeId: "services-networking",
          xp: 10,
          content:
            "Pods come and go with changing IPs, so you need something stable in front of them. A **Service** is a durable network endpoint — a fixed name and IP — that routes traffic to a changing set of pods selected by their **labels**. Your frontend talks to `backend` (the Service), and Kubernetes load-balances across whatever backend pods currently exist, no matter how often they're replaced.\n\nServices come in types. **ClusterIP** (the default) is reachable only *inside* the cluster — perfect for internal services like a database that other pods use but the outside world shouldn't. **NodePort** and **LoadBalancer** expose a Service *outside* the cluster for public traffic. The principle mirrors container networking: expose only what genuinely needs to face the outside world, and keep everything else internal with ClusterIP.\n\nServices also give you built-in **DNS**: within the cluster, a Service is reachable by its name, so `backend` just resolves — no IP tracking required.",
          questions: [
            {
              id: "q1",
              prompt: "What problem does a Service primarily solve?",
              options: [
                { id: "a", text: "It gives a changing set of pods one stable address and load-balances across them" },
                { id: "b", text: "It builds container images for the pods" },
                { id: "c", text: "It permanently freezes each pod's IP address" },
              ],
              correctOptionId: "a",
              explanation:
                "A Service provides a stable name/IP in front of ephemeral pods and distributes traffic to the current healthy set, solving the changing-IP problem.",
            },
            {
              id: "q2",
              prompt: "You have an internal database that only other pods in the cluster should reach. Which Service type fits?",
              options: [
                { id: "a", text: "ClusterIP — reachable only inside the cluster" },
                { id: "b", text: "LoadBalancer — exposed to the public internet" },
                { id: "c", text: "NodePort — opened on every node's external port" },
              ],
              correctOptionId: "a",
              explanation:
                "ClusterIP keeps the Service internal to the cluster, the right choice for something only other pods need — smaller exposure than NodePort or LoadBalancer.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "k8s-l4-a2",
          title: "Exposing a service safely",
          skillNodeId: "services-networking",
          xp: 15,
          scenario:
            "Your app has a public web frontend and an internal Redis cache. A teammate proposes giving both a LoadBalancer Service 'so they're easy to reach.' How should the exposure actually be set up?",
          choices: [
            {
              id: "a",
              text: "Expose the frontend with a LoadBalancer; keep Redis on a ClusterIP so only in-cluster pods can reach it",
              outcome:
                "The public reaches the frontend; the frontend reaches Redis internally by name; nothing outside the cluster can touch Redis.",
              rationale:
                "Only the frontend needs public exposure. Keeping Redis internal (ClusterIP) minimizes attack surface while still letting pods use it — the same 'expose only what must be exposed' rule from container networking.",
              correct: true,
            },
            {
              id: "b",
              text: "Give both a LoadBalancer so everything is publicly reachable",
              outcome:
                "Redis is now exposed to the internet, often unauthenticated — a serious risk for zero benefit, since only in-cluster pods ever needed it.",
              rationale:
                "Publicly exposing an internal cache widens the attack surface pointlessly. Internal services should stay on ClusterIP.",
              correct: false,
            },
            {
              id: "c",
              text: "Put both on ClusterIP so nothing is exposed and the cluster stays 'secure'",
              outcome:
                "Redis is fine, but now the public frontend is unreachable from outside — users can't load the app at all.",
              rationale:
                "The frontend genuinely needs external exposure. Locking everything internal breaks the app's actual purpose; match exposure to need.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "k8s-l5",
      title: "ConfigMaps and Secrets",
      description: "Separate configuration and sensitive values from your images.",
      skillNodeId: "config-secrets",
      estimatedMinutes: 14,
      activities: [
        {
          type: "explanation_check",
          id: "k8s-l5-a1",
          title: "Config out of the image",
          skillNodeId: "config-secrets",
          xp: 10,
          content:
            "Your container image should be built once and run in any environment, so environment-specific configuration doesn't belong baked into it. Kubernetes provides two objects for injecting config into pods at runtime: **ConfigMaps** for non-sensitive settings (feature flags, URLs, log levels) and **Secrets** for sensitive values (passwords, API keys, tokens). Both can be surfaced to a container as environment variables or mounted files.\n\nA critical caveat: a Kubernetes Secret is only **base64-encoded**, not encrypted, by default. Base64 is trivially reversible — it hides a value from a casual glance, nothing more. Real protection comes from restricting who can read Secrets (access control) and enabling encryption of the cluster's data store. Treat 'it's a Secret object' as a starting point, not a guarantee of confidentiality.\n\nThe payoff mirrors the Docker rule 'build once, run anywhere': the same image plus a different ConfigMap/Secret runs correctly in dev, staging, and production.",
          questions: [
            {
              id: "q1",
              prompt: "Where should a database password used by a pod be stored?",
              options: [
                { id: "a", text: "In a Secret, injected into the pod at runtime — not baked into the image" },
                { id: "b", text: "Hard-coded into the container image so it's always available" },
                { id: "c", text: "In a ConfigMap, which is designed for sensitive values" },
              ],
              correctOptionId: "a",
              explanation:
                "Sensitive values go in Secrets and are injected at runtime; ConfigMaps are for non-sensitive config, and baking secrets into images exposes them in the image.",
            },
            {
              id: "q2",
              prompt: "Is a default Kubernetes Secret encrypted?",
              options: [
                { id: "a", text: "No — it's only base64-encoded, which is easily reversible; real protection needs access control and encryption at rest" },
                { id: "b", text: "Yes — Secrets are always strongly encrypted by default" },
                { id: "c", text: "Yes — base64 encoding is a form of encryption" },
              ],
              correctOptionId: "a",
              explanation:
                "Base64 is encoding, not encryption — anyone can decode it. Protecting Secrets relies on RBAC and enabling encryption of the cluster datastore.",
            },
          ],
        },
        {
          type: "applied_task",
          id: "k8s-l5-a2",
          title: "Plan configuration for a service",
          skillNodeId: "config-secrets",
          xp: 15,
          prompt:
            "You're moving an app's configuration out of its image and into Kubernetes. Check off each choice that reflects good practice.",
          submissionType: "checklist",
          checklist: [
            { id: "c1", text: "Non-sensitive settings (log level, feature flags, service URLs) go in a ConfigMap" },
            { id: "c2", text: "Sensitive values (DB password, API keys) go in a Secret, not a ConfigMap" },
            { id: "c3", text: "The same image is reused across environments, differing only by ConfigMap/Secret" },
            { id: "c4", text: "Access to Secrets is restricted, and encryption at rest is relied on rather than base64 alone" },
            { id: "c5", text: "No secrets or environment-specific config are hard-coded into the container image" },
          ],
          successFeedback:
            "That's the right separation: config and secrets live outside the image, sensitive data is in Secrets with real access controls, and one image serves every environment.",
          reviewFeedback:
            "Each item matters. Putting secrets in a ConfigMap or trusting base64 alone leaves sensitive data exposed; baking config into the image breaks 'build once, run anywhere.'",
        },
      ],
    },
    {
      id: "k8s-l6",
      title: "Working with kubectl",
      description: "The declarative apply-inspect-debug loop.",
      skillNodeId: "kubectl-workflow",
      estimatedMinutes: 16,
      activities: [
        {
          type: "explanation_check",
          id: "k8s-l6-a1",
          title: "apply, get, describe, logs",
          skillNodeId: "kubectl-workflow",
          xp: 10,
          content:
            "`kubectl` is how you talk to the cluster, and the professional workflow is **declarative**: you write manifests (YAML files describing the desired objects), keep them in version control, and run `kubectl apply -f` to make the cluster match them. Editing files and re-applying — rather than issuing one-off imperative commands — means your cluster's state is reviewable, repeatable, and recoverable.\n\nFour commands cover most day-to-day work. `kubectl get <kind>` lists objects and their status. `kubectl describe <kind> <name>` shows a detailed report including recent **events** — often the first place a problem is explained. `kubectl logs <pod>` prints a container's output. And `kubectl apply -f file.yaml` reconciles the cluster to your manifest.\n\nWhen something's wrong, the reflex is: `get` to see status, `describe` to read the events, `logs` to see what the app itself said. That sequence resolves most issues without guessing.",
          questions: [
            {
              id: "q1",
              prompt: "Why is a declarative `kubectl apply -f manifest.yaml` workflow preferred over ad-hoc imperative commands?",
              options: [
                { id: "a", text: "Manifests can be version-controlled, reviewed, and re-applied, making cluster state repeatable and recoverable" },
                { id: "b", text: "Imperative commands don't work on real clusters" },
                { id: "c", text: "apply is the only command that can create objects" },
              ],
              correctOptionId: "a",
              explanation:
                "Declarative manifests are code you can review and re-apply, so the cluster's desired state is documented and reproducible — unlike one-off commands.",
            },
            {
              id: "q2",
              prompt: "A pod is stuck and you want to know *why* it isn't starting. Which command shows its recent events first?",
              options: [
                { id: "a", text: "kubectl describe pod <name>" },
                { id: "b", text: "kubectl scale pod <name>" },
                { id: "c", text: "kubectl apply pod <name>" },
              ],
              correctOptionId: "a",
              explanation:
                "`kubectl describe` includes the object's recent events, which usually explain scheduling failures, image pull errors, and probe failures.",
            },
          ],
        },
        {
          type: "applied_task",
          id: "k8s-l6-a2",
          title: "Apply a manifest",
          skillNodeId: "kubectl-workflow",
          xp: 15,
          prompt:
            "You have a manifest file `deployment.yaml` describing your app. Write the `kubectl` command that applies it, creating or updating the objects to match the file.",
          submissionType: "command",
          expectedPatterns: ["kubectl\\s+apply", "-f", "deployment\\.yaml"],
          successFeedback:
            "`kubectl apply -f deployment.yaml` reconciles the cluster to your manifest — creating the objects if absent, updating them if they already exist.",
          reviewFeedback:
            "A working version is `kubectl apply -f deployment.yaml`. `apply` reconciles to the file; the `-f` flag points at the manifest.",
        },
        {
          type: "scenario_decision",
          id: "k8s-l6-a3",
          title: "Debugging a CrashLoopBackOff",
          skillNodeId: "kubectl-workflow",
          xp: 15,
          scenario:
            "`kubectl get pods` shows your pod in `CrashLoopBackOff` — it keeps starting and crashing. You need to find out why. What's the most direct diagnostic path?",
          choices: [
            {
              id: "a",
              text: "Run `kubectl describe pod <name>` to read its events, and `kubectl logs <name>` to see the app's own output",
              outcome:
                "The logs show the app exiting because a required environment variable is missing. You add it to the ConfigMap and the pod stays up.",
              rationale:
                "`describe` surfaces scheduling/probe events and `logs` shows the process's own error — together they almost always reveal the crash cause. This is the standard debugging loop.",
              correct: true,
            },
            {
              id: "b",
              text: "Delete and recreate the pod repeatedly until it happens to stay up",
              outcome:
                "Each recreated pod hits the same missing configuration and crashes identically. You've learned nothing and fixed nothing.",
              rationale:
                "CrashLoopBackOff is deterministic here — recreating without reading logs just repeats the same failure. Diagnose before acting.",
              correct: false,
            },
            {
              id: "c",
              text: "Scale the Deployment to 20 replicas so at least some pods survive",
              outcome:
                "Now twenty pods crash-loop instead of one, consuming resources and obscuring the actual error.",
              rationale:
                "Adding replicas multiplies a deterministic failure rather than explaining it. The fix is reading the events and logs, not scaling up.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "k8s-l7",
      title: "Health checks and self-healing",
      description: "Probes that let Kubernetes know when to restart or route around a pod.",
      skillNodeId: "health-self-healing",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "k8s-l7-a1",
          title: "Liveness and readiness probes",
          skillNodeId: "health-self-healing",
          xp: 10,
          content:
            "Kubernetes can restart a crashed process on its own, but it can't tell whether a *running* process is actually healthy unless you tell it how to check. That's what **probes** do.\n\nA **liveness probe** answers 'is this container still working, or is it hung?' If it fails repeatedly, Kubernetes restarts the container — recovering from deadlocks a crash wouldn't trigger. A **readiness probe** answers 'is this container ready to receive traffic *right now*?' If it fails, Kubernetes keeps the pod running but temporarily removes it from the Service's load-balancing pool, so requests only go to pods that can actually handle them. This is what lets a pod finish warming up (loading data, connecting to a database) before traffic arrives, without being killed for being slow to start.\n\nThe distinction is the whole point: **liveness failure → restart the container; readiness failure → stop sending it traffic (but leave it running).** Together they are how Kubernetes keeps an app both alive and correctly routed — self-healing you configure by describing what 'healthy' means.",
          questions: [
            {
              id: "q1",
              prompt: "A pod is alive but still loading data and can't serve requests yet. Which probe should report it as not-ready so it receives no traffic?",
              options: [
                { id: "a", text: "A readiness probe — it removes the pod from the Service pool without killing it" },
                { id: "b", text: "A liveness probe — it should restart the container immediately" },
                { id: "c", text: "Neither; there's no way to delay traffic to a warming pod" },
              ],
              correctOptionId: "a",
              explanation:
                "A failing readiness probe pulls the pod out of load balancing while leaving it running, so it can finish warming up before traffic arrives.",
            },
            {
              id: "q2",
              prompt: "What does Kubernetes do when a liveness probe fails repeatedly?",
              options: [
                { id: "a", text: "Restarts the container, on the assumption it's hung or broken" },
                { id: "b", text: "Permanently deletes the Deployment" },
                { id: "c", text: "Sends more traffic to the pod to keep it busy" },
              ],
              correctOptionId: "a",
              explanation:
                "A failed liveness probe signals the container is unhealthy, so Kubernetes restarts it to recover from states a plain crash wouldn't catch.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "k8s-l7-a2",
          title: "Traffic hitting a not-ready pod",
          skillNodeId: "health-self-healing",
          xp: 15,
          scenario:
            "During deploys, some users get errors for the first few seconds because new pods receive traffic before they've finished connecting to the database. The pods aren't crashing — they're just not ready instantly. What's the right fix?",
          choices: [
            {
              id: "a",
              text: "Add a readiness probe that only passes once the pod can reach its dependencies, so the Service withholds traffic until the pod is truly ready",
              outcome:
                "New pods stay out of the load-balancer pool until they report ready. The startup errors during deploys disappear.",
              rationale:
                "A readiness probe is exactly the tool for 'running but not yet able to serve.' It gates traffic on genuine readiness without killing slow-to-warm pods.",
              correct: true,
            },
            {
              id: "b",
              text: "Add an aggressive liveness probe so the not-ready pods get restarted",
              outcome:
                "Kubernetes restarts pods that were merely warming up, so they never finish connecting — turning a brief delay into a restart loop.",
              rationale:
                "Liveness is for hung/broken containers, not slow starters. Using it here kills healthy pods mid-warmup, making things worse.",
              correct: false,
            },
            {
              id: "c",
              text: "Tell users to refresh the page during deployments",
              outcome:
                "You push a platform problem onto users and still serve errors on every deploy, when a readiness probe would prevent them entirely.",
              rationale:
                "Shifting the burden to users ignores the built-in mechanism (readiness probes) designed to solve exactly this.",
              correct: false,
            },
          ],
        },
        {
          type: "applied_task",
          id: "k8s-l7-a3",
          title: "Design a self-healing workload",
          skillNodeId: "health-self-healing",
          xp: 20,
          prompt:
            "You're making a service resilient on Kubernetes. Check off each element that contributes to genuine self-healing and safe operation.",
          submissionType: "checklist",
          checklist: [
            { id: "c1", text: "Run the app via a Deployment with more than one replica, not a bare pod" },
            { id: "c2", text: "A liveness probe so hung containers get restarted automatically" },
            { id: "c3", text: "A readiness probe so traffic only reaches pods that can serve it" },
            { id: "c4", text: "A Service in front of the pods for a stable, load-balanced address" },
            { id: "c5", text: "Config and secrets injected via ConfigMap/Secret so pods start correctly anywhere" },
          ],
          successFeedback:
            "That's a genuinely self-healing setup: multiple replicas maintained by a Deployment, probes that restart the hung and route around the not-ready, and a stable Service address in front.",
          reviewFeedback:
            "Each item pulls its weight. Without a liveness probe hung pods stay hung; without readiness, deploys serve errors; without a Service, clients chase changing pod IPs.",
        },
      ],
    },
  ],
};

import type { CourseContent } from "@/lib/types";

/**
 * Starter course: the Linux/Unix command line for working engineers.
 * Vendor-neutral shell fundamentals that transfer across macOS, Linux, and
 * WSL. Examples use bash/POSIX-style commands.
 */
export const linuxCommandLine: CourseContent = {
  contentId: "content-linux-command-line",
  title: "Linux Command Line Essentials",
  description:
    "Get fluent in the shell: navigate the filesystem, manage files and permissions, wire commands together, control processes, and work on remote servers.",
  outcome: "Work confidently on a Linux server from the command line alone",
  tags: ["Linux", "CLI", "Fundamentals"],
  estimatedHours: 7,
  skillNodes: [
    {
      id: "shell-navigation",
      title: "Navigating the Filesystem",
      description: "Move around directories and list what's there.",
      prereqIds: [],
      lessonIds: ["linux-l1"],
      position: { col: 0, row: 1 },
    },
    {
      id: "files-permissions",
      title: "Files & Permissions",
      description: "Create, move, and control access to files.",
      prereqIds: ["shell-navigation"],
      lessonIds: ["linux-l2"],
      position: { col: 1, row: 0 },
    },
    {
      id: "pipes-redirection",
      title: "Pipes & Redirection",
      description: "Combine small tools into powerful one-liners.",
      prereqIds: ["shell-navigation"],
      lessonIds: ["linux-l3"],
      position: { col: 1, row: 2 },
    },
    {
      id: "process-management",
      title: "Process Management",
      description: "Inspect, background, and terminate processes.",
      prereqIds: ["files-permissions", "pipes-redirection"],
      lessonIds: ["linux-l4"],
      position: { col: 2, row: 1 },
    },
    {
      id: "package-managers",
      title: "Package Managers",
      description: "Install and update software from the shell.",
      prereqIds: ["files-permissions"],
      lessonIds: ["linux-l5"],
      position: { col: 2, row: 3 },
    },
    {
      id: "shell-scripting",
      title: "Shell Scripting Basics",
      description: "Automate tasks with reusable scripts.",
      prereqIds: ["pipes-redirection", "process-management"],
      lessonIds: ["linux-l6"],
      position: { col: 3, row: 1 },
    },
    {
      id: "ssh-remote",
      title: "SSH & Remote Servers",
      description: "Log in to and manage machines over the network.",
      prereqIds: ["process-management"],
      lessonIds: ["linux-l7"],
      position: { col: 3, row: 3 },
    },
  ],
  lessons: [
    {
      id: "linux-l1",
      title: "Finding your way around",
      description: "Paths, moving between directories, and listing files.",
      skillNodeId: "shell-navigation",
      estimatedMinutes: 14,
      activities: [
        {
          type: "explanation_check",
          id: "linux-l1-a1",
          title: "Paths and the working directory",
          skillNodeId: "shell-navigation",
          xp: 10,
          content:
            "The shell always has a **current working directory** — where you 'are.' `pwd` (print working directory) tells you; `ls` lists the contents; `cd` (change directory) moves you.\n\nPaths come in two flavors. An **absolute path** starts from the root `/` and is unambiguous anywhere: `/home/ada/project`. A **relative path** is interpreted from your current directory: `project/src` means 'the src folder inside the project folder here.' Two special names help: `.` is the current directory and `..` is the parent, so `cd ..` moves up one level. A bare `cd` (or `cd ~`) returns you to your **home directory**, also written `~`.\n\nGetting comfortable with the difference between absolute and relative paths is the foundation for everything else — most 'file not found' errors trace back to running a command from a directory you didn't expect.",
          questions: [
            {
              id: "q1",
              prompt: "What does `cd ..` do?",
              options: [
                { id: "a", text: "Moves up to the parent of the current directory" },
                { id: "b", text: "Moves to your home directory" },
                { id: "c", text: "Lists the files in the current directory" },
              ],
              correctOptionId: "a",
              explanation:
                "`..` refers to the parent directory, so `cd ..` moves you up one level in the tree.",
            },
            {
              id: "q2",
              prompt: "Which of these is an absolute path?",
              options: [
                { id: "a", text: "/home/ada/project" },
                { id: "b", text: "project/src" },
                { id: "c", text: "../logs" },
              ],
              correctOptionId: "a",
              explanation:
                "Absolute paths begin at the root `/` and mean the same thing regardless of your current directory. The others are relative.",
            },
          ],
        },
        {
          type: "applied_task",
          id: "linux-l1-a2",
          title: "List files, including hidden ones",
          skillNodeId: "shell-navigation",
          xp: 15,
          prompt:
            "Write a single command that lists the contents of the current directory in long format (permissions, sizes, dates) *and* includes hidden files (those beginning with a dot).",
          submissionType: "command",
          expectedPatterns: ["ls\\s+.*-.*l", "ls\\s+.*-.*a"],
          successFeedback:
            "`ls -la` (or `ls -al`) does it — `-l` gives the long, detailed format and `-a` reveals hidden dotfiles like `.env` and `.gitignore`.",
          reviewFeedback:
            "A working version is `ls -la`. The `-l` flag gives long format and `-a` shows hidden files; you can combine them as `-la`.",
        },
        {
          type: "scenario_decision",
          id: "linux-l1-a3",
          title: "The command that can't find the file",
          skillNodeId: "shell-navigation",
          xp: 15,
          scenario:
            "You run `cat config.json` and get 'No such file or directory,' but you're sure the file exists somewhere in your project. What's the most useful first step?",
          choices: [
            {
              id: "a",
              text: "Run `pwd` and `ls` to confirm where you are and what's actually in this directory",
              outcome:
                "`pwd` shows you're one directory above the file. You `cd` into the right folder and `cat config.json` works.",
              rationale:
                "'No such file' with a relative path almost always means you're in the wrong directory. Confirming your location and contents is the fast, correct diagnosis.",
              correct: true,
            },
            {
              id: "b",
              text: "Assume the file is corrupted and recreate it from scratch",
              outcome:
                "You waste time rebuilding a file that was fine — it just wasn't in the directory you ran the command from.",
              rationale:
                "The error is about location, not corruption. Recreating the file ignores the actual cause.",
              correct: false,
            },
            {
              id: "c",
              text: "Reinstall the shell, assuming `cat` is broken",
              outcome:
                "`cat` was never broken; the same error would appear afterward, because the working directory is still wrong.",
              rationale:
                "A standard tool failing to find a relatively-pathed file points at the path, not the tool. Check where you are first.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "linux-l2",
      title: "Files and permissions",
      description: "Manipulate files and control who can do what.",
      skillNodeId: "files-permissions",
      estimatedMinutes: 16,
      activities: [
        {
          type: "explanation_check",
          id: "linux-l2-a1",
          title: "Reading permission strings",
          skillNodeId: "files-permissions",
          xp: 10,
          content:
            "Every file has an **owner**, a **group**, and a set of permissions for three classes: the owner (**u**ser), the **g**roup, and everyone else (**o**ther). Each class can **read** (r), **write** (w), and **execute** (x).\n\n`ls -l` shows this as a ten-character string like `-rwxr-xr--`. Ignore the first character (file type), then read three triplets: `rwx` (owner can read/write/execute), `r-x` (group can read and execute, not write), `r--` (others can only read). Those same bits are often written as numbers: r=4, w=2, x=1, summed per class — so `rwxr-xr--` is `754`.\n\nYou change permissions with `chmod` and ownership with `chown`. The most common real task is making a script executable: `chmod +x script.sh` adds the execute bit so you can run it.",
          questions: [
            {
              id: "q1",
              prompt: "A file shows `-rw-r--r--`. Who can modify (write to) it?",
              options: [
                { id: "a", text: "Only the owner" },
                { id: "b", text: "The owner and the group" },
                { id: "c", text: "Everyone" },
              ],
              correctOptionId: "a",
              explanation:
                "The triplets are owner `rw-` (read/write), group `r--` (read only), others `r--` (read only). Only the owner has the write bit.",
            },
            {
              id: "q2",
              prompt: "You wrote `deploy.sh` but the shell says 'Permission denied' when you run it. What's the usual fix?",
              options: [
                { id: "a", text: "Add the execute bit with `chmod +x deploy.sh`" },
                { id: "b", text: "Rename it to remove the .sh extension" },
                { id: "c", text: "Move it to your home directory" },
              ],
              correctOptionId: "a",
              explanation:
                "'Permission denied' on a script you own usually means the execute bit isn't set. `chmod +x` adds it.",
            },
          ],
        },
        {
          type: "applied_task",
          id: "linux-l2-a2",
          title: "Make a script executable",
          skillNodeId: "files-permissions",
          xp: 15,
          prompt:
            "You've written a shell script named `backup.sh` but can't run it. Write the command that adds the execute permission to it.",
          submissionType: "command",
          expectedPatterns: ["chmod\\s+.*(\\+x|[0-7]{3,4})", "backup\\.sh"],
          successFeedback:
            "`chmod +x backup.sh` adds the execute bit so `./backup.sh` will run. (A numeric mode like `chmod 755 backup.sh` works too.)",
          reviewFeedback:
            "A working version is `chmod +x backup.sh`. The `chmod` command changes permissions, and `+x` adds the execute bit needed to run a script.",
        },
        {
          type: "scenario_decision",
          id: "linux-l2-a3",
          title: "Too-open permissions",
          skillNodeId: "files-permissions",
          xp: 15,
          scenario:
            "A teammate fixed a 'permission denied' error on a private key file by running `chmod 777` on it, giving everyone full read/write/execute. It works now. What's the problem, and what's the right fix?",
          choices: [
            {
              id: "a",
              text: "777 exposes a private key to every user on the system; tighten it (e.g. `chmod 600`) so only the owner can read and write it",
              outcome:
                "You set `chmod 600` on the key. It still works for the owner, and no other user can read the secret anymore.",
              rationale:
                "`777` grants everyone full access — dangerous for a secret. Private keys should be readable only by their owner; SSH even refuses keys that are too open.",
              correct: true,
            },
            {
              id: "b",
              text: "Nothing's wrong — 777 is the safe default because it avoids permission errors entirely",
              outcome:
                "Every user on the machine can now read and alter the private key, a serious security hole that just happens not to throw an error.",
              rationale:
                "'No error' isn't the same as 'safe.' 777 is maximally permissive, the opposite of what a secret needs.",
              correct: false,
            },
            {
              id: "c",
              text: "Delete the key and stop using SSH keys to avoid permission issues",
              outcome:
                "You've thrown away a secure authentication method to dodge a one-line permissions fix.",
              rationale:
                "The issue is just over-broad permissions, fixed with one `chmod`. Abandoning key-based auth is a large, unnecessary step backward.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "linux-l3",
      title: "Pipes and redirection",
      description: "Chain tools together and steer their input and output.",
      skillNodeId: "pipes-redirection",
      estimatedMinutes: 16,
      activities: [
        {
          type: "explanation_check",
          id: "linux-l3-a1",
          title: "stdin, stdout, and the pipe",
          skillNodeId: "pipes-redirection",
          xp: 10,
          content:
            "The Unix philosophy is 'small tools that do one thing well, combined.' The glue is three streams every program has: **stdin** (input), **stdout** (normal output), and **stderr** (error output).\n\nThe **pipe** `|` connects one program's stdout to the next program's stdin: `cat access.log | grep ERROR | wc -l` reads a log, keeps only lines containing ERROR, and counts them — three simple tools forming one query. **Redirection** sends a stream to or from a file instead: `> file` overwrites a file with stdout, `>>` appends, and `< file` feeds a file into stdin. `2>` redirects stderr specifically.\n\nThe key distinction beginners miss: `>` **overwrites** (destroys existing contents) while `>>` **appends**. Reaching for the wrong one can wipe a file you meant to add to.",
          questions: [
            {
              id: "q1",
              prompt: "What does the pipe `|` do in `A | B`?",
              options: [
                { id: "a", text: "Sends A's standard output into B's standard input" },
                { id: "b", text: "Runs A and B at completely separate times with no connection" },
                { id: "c", text: "Saves A's output into a file named B" },
              ],
              correctOptionId: "a",
              explanation:
                "A pipe connects the stdout of the left command to the stdin of the right one, letting you compose tools into a pipeline.",
            },
            {
              id: "q2",
              prompt: "You want to add a line to an existing log file without erasing it. Which operator?",
              options: [
                { id: "a", text: ">> (append)" },
                { id: "b", text: "> (overwrite)" },
                { id: "c", text: "< (read from file)" },
              ],
              correctOptionId: "a",
              explanation:
                "`>>` appends to the file. `>` would overwrite it, discarding everything already there — a common and painful mistake.",
            },
          ],
        },
        {
          type: "applied_task",
          id: "linux-l3-a2",
          title: "Count matching lines with a pipeline",
          skillNodeId: "pipes-redirection",
          xp: 20,
          prompt:
            "Write a one-line pipeline that reads `app.log`, keeps only the lines containing the word `ERROR`, and counts how many there are. Use `grep` and `wc`.",
          submissionType: "command",
          expectedPatterns: ["grep\\s+.*ERROR", "\\|", "wc\\s+.*-l"],
          successFeedback:
            "Nicely done — `grep ERROR app.log | wc -l` filters to error lines and counts them. (Note `grep -c ERROR app.log` is an even shorter way to count matches.)",
          reviewFeedback:
            "A working version is `grep ERROR app.log | wc -l`. You need `grep` to filter for ERROR, a pipe `|`, and `wc -l` to count the resulting lines.",
        },
        {
          type: "scenario_decision",
          id: "linux-l3-a3",
          title: "The file you accidentally emptied",
          skillNodeId: "pipes-redirection",
          xp: 15,
          scenario:
            "You meant to add a line to `notes.txt` and ran `echo \"new note\" > notes.txt`. Now the file contains only that one line — your previous notes are gone. What happened, and how do you avoid it next time?",
          choices: [
            {
              id: "a",
              text: "`>` overwrote the file; use `>>` to append instead, which adds to the file without destroying its contents",
              outcome:
                "You understand the mistake: `>` truncates then writes. From now on you use `>>` when you mean to add, and the old contents stay.",
              rationale:
                "`>` replaces the file's entire contents; `>>` appends. Confusing the two is exactly how existing data gets wiped. The fix is the right operator.",
              correct: true,
            },
            {
              id: "b",
              text: "The shell has a bug; report it and keep using `>` for appending",
              outcome:
                "It's not a bug — `>` behaved exactly as designed. Keep using it to 'append' and you'll erase files again.",
              rationale:
                "Overwriting is the documented behavior of `>`. Blaming the shell means repeating the mistake.",
              correct: false,
            },
            {
              id: "c",
              text: "Avoid redirection entirely and only edit files in a text editor forever",
              outcome:
                "You lose a fast, scriptable tool over a one-character mixup that `>>` solves directly.",
              rationale:
                "Redirection is essential and safe once you know `>` vs `>>`. Abandoning it overcorrects for a simple, learnable distinction.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "linux-l4",
      title: "Managing processes",
      description: "See what's running, background jobs, and stop misbehaving programs.",
      skillNodeId: "process-management",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "linux-l4-a1",
          title: "Processes, PIDs, and signals",
          skillNodeId: "process-management",
          xp: 10,
          content:
            "Every running program is a **process** with a numeric **PID** (process ID). `ps` lists processes; `top` or `htop` show them live with CPU and memory usage. To find a specific one you often pipe: `ps aux | grep node`.\n\nYou control a process by sending it a **signal**. `kill <PID>` sends the default **SIGTERM** — a polite 'please shut down' that lets the program clean up. `kill -9 <PID>` sends **SIGKILL**, which the process can't catch or ignore — an immediate, forceful stop. The habit worth building: try SIGTERM first and reserve SIGKILL for a process that's truly stuck, because SIGKILL gives no chance to flush data or release resources cleanly.\n\nA long-running command can also be sent to the **background** by ending it with `&`, freeing your terminal while it keeps running.",
          questions: [
            {
              id: "q1",
              prompt: "What's the difference between `kill` (SIGTERM) and `kill -9` (SIGKILL)?",
              options: [
                { id: "a", text: "SIGTERM asks the process to shut down gracefully; SIGKILL forces it to stop immediately and can't be caught" },
                { id: "b", text: "SIGTERM stops the computer; SIGKILL stops one process" },
                { id: "c", text: "They are identical; -9 is just shorthand" },
              ],
              correctOptionId: "a",
              explanation:
                "SIGTERM lets a process clean up and exit; SIGKILL is an uncatchable, forceful termination that skips cleanup. Try SIGTERM first.",
            },
            {
              id: "q2",
              prompt: "Why prefer SIGTERM over SIGKILL when possible?",
              options: [
                { id: "a", text: "SIGTERM lets the program flush data and release resources before exiting" },
                { id: "b", text: "SIGKILL is slower to take effect" },
                { id: "c", text: "SIGTERM restarts the process automatically" },
              ],
              correctOptionId: "a",
              explanation:
                "A graceful SIGTERM gives the process a chance to save state and clean up; SIGKILL cuts it off mid-work, risking corruption or leaked resources.",
            },
          ],
        },
        {
          type: "applied_task",
          id: "linux-l4-a2",
          title: "Find a running process by name",
          skillNodeId: "process-management",
          xp: 15,
          prompt:
            "A stuck `node` server needs to be found before you can stop it. Write a command that lists all processes and filters to ones mentioning `node`. (Use `ps` and `grep`.)",
          submissionType: "command",
          expectedPatterns: ["ps\\s+.*a?u?x?", "\\|", "grep\\s+.*node"],
          successFeedback:
            "`ps aux | grep node` lists every process and filters to the node ones, showing you the PID you'd pass to `kill`.",
          reviewFeedback:
            "A working version is `ps aux | grep node`. You need `ps` to list processes, a pipe, and `grep node` to filter — the PID in the output is what you'd kill.",
        },
        {
          type: "scenario_decision",
          id: "linux-l4-a3",
          title: "A server that won't stop",
          skillNodeId: "process-management",
          xp: 15,
          scenario:
            "A development server is misbehaving. You send `kill <PID>` (SIGTERM) but it keeps running after several seconds. What's the reasonable next step?",
          choices: [
            {
              id: "a",
              text: "Give it a moment to shut down gracefully; if it's truly hung, escalate to `kill -9 <PID>` (SIGKILL)",
              outcome:
                "You wait briefly, it doesn't respond, so you SIGKILL it and it stops immediately. You used force only after the graceful attempt failed.",
              rationale:
                "SIGTERM first, then SIGKILL for a genuinely stuck process is the correct escalation — force is a last resort, not the opening move.",
              correct: true,
            },
            {
              id: "b",
              text: "Immediately reboot the entire machine to clear the process",
              outcome:
                "Every other program dies too, and you interrupt anything else running, all to stop one process a SIGKILL would have handled.",
              rationale:
                "Rebooting to kill one process is a sledgehammer. Target the process directly with SIGKILL instead.",
              correct: false,
            },
            {
              id: "c",
              text: "Send SIGTERM twenty more times in a row",
              outcome:
                "The process ignores repeated SIGTERMs the same way it ignored the first; nothing changes.",
              rationale:
                "If a process isn't responding to SIGTERM, repeating it won't help. Escalate to SIGKILL for a truly hung process.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "linux-l5",
      title: "Installing software with package managers",
      description: "Get and update tools without hunting for downloads.",
      skillNodeId: "package-managers",
      estimatedMinutes: 12,
      activities: [
        {
          type: "explanation_check",
          id: "linux-l5-a1",
          title: "What a package manager does",
          skillNodeId: "package-managers",
          xp: 10,
          content:
            "A **package manager** installs, updates, and removes software from trusted **repositories**, resolving **dependencies** automatically. Instead of hunting a website for a download, you ask the manager by name.\n\nWhich one depends on the system: Debian/Ubuntu use `apt` (`apt install nginx`), Red Hat/Fedora use `dnf`, Alpine uses `apk`, macOS commonly uses Homebrew's `brew`. The pattern is the same everywhere: an **update** step refreshes the list of available packages, then an **install** step fetches a package and everything it depends on.\n\nOn Debian/Ubuntu the idiom is `sudo apt update` (refresh the index) followed by `sudo apt install <package>`. **`sudo`** runs a command with administrator (root) privileges, which installing system software requires — but it's also why you should only `sudo` commands you understand and trust.",
          questions: [
            {
              id: "q1",
              prompt: "What key problem does a package manager solve beyond just downloading a file?",
              options: [
                { id: "a", text: "It automatically resolves and installs the package's dependencies from trusted repositories" },
                { id: "b", text: "It makes your internet connection faster" },
                { id: "c", text: "It writes the software's source code for you" },
              ],
              correctOptionId: "a",
              explanation:
                "Package managers pull software and all its dependencies from vetted repositories, handling the dependency graph you'd otherwise resolve by hand.",
            },
            {
              id: "q2",
              prompt: "Why does installing system software usually require `sudo`?",
              options: [
                { id: "a", text: "It runs the command with administrator privileges needed to modify the system" },
                { id: "b", text: "sudo makes the download complete faster" },
                { id: "c", text: "sudo encrypts the installed files" },
              ],
              correctOptionId: "a",
              explanation:
                "`sudo` elevates to root privileges, which are required to write to system directories — so only run trusted commands with it.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "linux-l5-a2",
          title: "'Package not found'",
          skillNodeId: "package-managers",
          xp: 15,
          scenario:
            "On a fresh Ubuntu server, `sudo apt install htop` fails with 'Unable to locate package htop.' The package definitely exists. What's the most likely fix?",
          choices: [
            {
              id: "a",
              text: "Run `sudo apt update` first to refresh the local package index, then install",
              outcome:
                "After `apt update`, the index is current and `sudo apt install htop` succeeds. The package was always available; the local list was just stale.",
              rationale:
                "A fresh system often has an empty or outdated package index. `apt update` refreshes the list of available packages so install can find them.",
              correct: true,
            },
            {
              id: "b",
              text: "Download the htop source from a random website and run its installer as root",
              outcome:
                "You bypass the trusted repository for an unvetted download run with root — a real security risk — to avoid a one-line index refresh.",
              rationale:
                "Grabbing binaries from arbitrary sites and running them as root is dangerous and unnecessary when the package is in the official repo.",
              correct: false,
            },
            {
              id: "c",
              text: "Conclude htop can't be installed on this system and give up",
              outcome:
                "You go without a useful tool that installs cleanly the moment the package index is refreshed.",
              rationale:
                "'Unable to locate' on a real package almost always means a stale index, not an incompatible system. `apt update` is the fix.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "linux-l6",
      title: "Shell scripting basics",
      description: "Turn a sequence of commands into a reusable script.",
      skillNodeId: "shell-scripting",
      estimatedMinutes: 16,
      activities: [
        {
          type: "explanation_check",
          id: "linux-l6-a1",
          title: "Shebangs, variables, and exit codes",
          skillNodeId: "shell-scripting",
          xp: 10,
          content:
            "A **shell script** is a text file of commands the shell runs top to bottom. The first line is the **shebang**: `#!/usr/bin/env bash` tells the system which interpreter to use. Make the file executable (`chmod +x`) and run it with `./script.sh`.\n\nScripts use **variables** (`NAME=\"world\"`, read back as `$NAME` or `${NAME}`), **conditionals** (`if [ -f \"$FILE\" ]; then ... fi`), and **loops** (`for f in *.log; do ... done`). A subtle but important habit: quote your variables (`\"$FILE\"`), because an unquoted variable containing spaces breaks into multiple arguments.\n\nEvery command returns an **exit code**: `0` means success, non-zero means failure, available as `$?`. Robust scripts check these, and many start with `set -e` so the script stops immediately if any command fails, rather than blindly continuing after an error.",
          questions: [
            {
              id: "q1",
              prompt: "What does an exit code of `0` conventionally mean?",
              options: [
                { id: "a", text: "The command succeeded" },
                { id: "b", text: "The command failed" },
                { id: "c", text: "The command is still running" },
              ],
              correctOptionId: "a",
              explanation:
                "By Unix convention, exit code 0 means success and any non-zero value signals some kind of failure.",
            },
            {
              id: "q2",
              prompt: "Why do careful scripts start with `set -e`?",
              options: [
                { id: "a", text: "So the script stops on the first failing command instead of blindly continuing" },
                { id: "b", text: "To make the script run faster" },
                { id: "c", text: "To hide error messages from the user" },
              ],
              correctOptionId: "a",
              explanation:
                "`set -e` makes the script exit as soon as a command fails, preventing later steps from running on a broken state.",
            },
          ],
        },
        {
          type: "applied_task",
          id: "linux-l6-a2",
          title: "Write a minimal script",
          skillNodeId: "shell-scripting",
          xp: 20,
          prompt:
            "Sketch the first two lines every robust bash script should start with: the shebang line that selects bash, and the line that makes it exit on the first error. (Two lines.)",
          submissionType: "command",
          expectedPatterns: ["#!.*bash", "set\\s+-e"],
          successFeedback:
            "That's the safe preamble: `#!/usr/bin/env bash` selects the interpreter and `set -e` makes the script abort on the first failing command instead of charging ahead.",
          reviewFeedback:
            "We were looking for a shebang like `#!/usr/bin/env bash` and `set -e`. The shebang picks the interpreter; `set -e` stops the script on the first error.",
        },
        {
          type: "scenario_decision",
          id: "linux-l6-a3",
          title: "The script that deleted too much",
          skillNodeId: "shell-scripting",
          xp: 15,
          scenario:
            "A cleanup script does `rm -rf \"$BUILD_DIR/\"*` to empty a build folder. One day `BUILD_DIR` was unset (empty), and the command became `rm -rf /*`, nearly wiping the system. What's the durable lesson?",
          choices: [
            {
              id: "a",
              text: "Guard against unset/empty variables — e.g. `set -u`, check the variable is non-empty before destructive commands, and quote paths",
              outcome:
                "You add `set -u` and an explicit check that `BUILD_DIR` is set and non-empty before any `rm`. An unset variable now aborts the script instead of destroying the disk.",
              rationale:
                "Destructive commands built from variables must be defended: `set -u` errors on unset variables, and an explicit non-empty check prevents an empty value from expanding into a catastrophe.",
              correct: true,
            },
            {
              id: "b",
              text: "It was bad luck; keep the script as-is and just be careful to always set the variable",
              outcome:
                "Relying on humans never making a mistake, the same empty-variable expansion eventually happens again with the same result.",
              rationale:
                "'Be more careful' isn't a safeguard. The script should fail safe when a variable is missing, not depend on perfect operators.",
              correct: false,
            },
            {
              id: "c",
              text: "Run the script as root always, so it has permission to finish whatever it starts",
              outcome:
                "Running as root removes the last barrier that might have limited the damage, making the failure mode worse, not better.",
              rationale:
                "More privilege increases blast radius. The fix is defensive scripting, not handing a fragile script more power.",
              correct: false,
            },
          ],
        },
      ],
    },
    {
      id: "linux-l7",
      title: "SSH and remote servers",
      description: "Log in securely and move files to another machine.",
      skillNodeId: "ssh-remote",
      estimatedMinutes: 15,
      activities: [
        {
          type: "explanation_check",
          id: "linux-l7-a1",
          title: "How SSH keys work",
          skillNodeId: "ssh-remote",
          xp: 10,
          content:
            "**SSH** (Secure Shell) gives you an encrypted terminal on a remote machine: `ssh ada@server.example.com` logs you in as `ada`. Everything you type and see is encrypted in transit.\n\nThe secure way to authenticate is a **key pair**, not a password. You generate two linked keys: a **private key** that never leaves your machine, and a **public key** you copy to the server. When you connect, the server challenges you in a way only the matching private key can answer — proving your identity without ever sending a secret over the network. This resists password guessing and is why most servers disable password login entirely.\n\nThe cardinal rule: the **private key stays private**. Never copy it to a server, paste it anywhere, or commit it to a repository. If it leaks, anyone holding it can log in as you — so you'd revoke it and generate a new pair.\n\nTo copy files over the same secure channel, `scp` and `rsync` work like `cp` but across machines.",
          questions: [
            {
              id: "q1",
              prompt: "In SSH key authentication, which key do you copy to the server and which stays on your machine?",
              options: [
                { id: "a", text: "The public key goes on the server; the private key stays only on your machine" },
                { id: "b", text: "The private key goes on the server; the public key stays with you" },
                { id: "c", text: "Both keys go on the server for safekeeping" },
              ],
              correctOptionId: "a",
              explanation:
                "You share the public key freely and keep the private key secret. The server verifies you against the public key without the private one ever leaving you.",
            },
            {
              id: "q2",
              prompt: "Why is key-based SSH generally preferred over password login for servers?",
              options: [
                { id: "a", text: "It proves identity without sending a secret over the network and resists password guessing" },
                { id: "b", text: "It makes the connection load web pages faster" },
                { id: "c", text: "It removes the need to encrypt the connection" },
              ],
              correctOptionId: "a",
              explanation:
                "Key auth avoids transmitting a reusable secret and is far harder to brute-force than a password, so servers often disable password login.",
            },
          ],
        },
        {
          type: "scenario_decision",
          id: "linux-l7-a2",
          title: "Deploying a private key the wrong way",
          skillNodeId: "ssh-remote",
          xp: 15,
          scenario:
            "To let a deploy server pull from your git repo, a teammate copied their personal SSH private key onto the shared server so 'it can authenticate.' What's wrong, and what's the right approach?",
          choices: [
            {
              id: "a",
              text: "A private key should never be placed on a shared server; instead generate a dedicated key pair for the server (or use a deploy key) and keep each private key on the one machine it belongs to",
              outcome:
                "You remove the personal key, generate a key pair on the deploy server itself, and register its public key with the repo. Each private key now lives on exactly one machine.",
              rationale:
                "Copying a personal private key onto a shared machine exposes it to everyone with access to that server. Each machine should have its own key pair, with private keys never leaving their origin.",
              correct: true,
            },
            {
              id: "b",
              text: "It's fine as long as the server is behind a firewall",
              outcome:
                "Anyone who gains access to that server — a compromise, another admin — now holds the teammate's personal key and can act as them everywhere it's authorized.",
              rationale:
                "A firewall doesn't change the fact that the private key is now readable on a shared box. Its exposure is the problem, not just network reachability.",
              correct: false,
            },
            {
              id: "c",
              text: "Also commit the private key to the repo so any deploy server can grab it easily",
              outcome:
                "Now the private key is in git history forever and in every clone — a far larger exposure than a single server.",
              rationale:
                "Committing a private key is one of the worst possible outcomes: permanent, widely-distributed exposure. Private keys never belong in a repository.",
              correct: false,
            },
          ],
        },
        {
          type: "applied_task",
          id: "linux-l7-a3",
          title: "Copy a file to a remote server",
          skillNodeId: "ssh-remote",
          xp: 15,
          prompt:
            "Write a command that securely copies a local file `build.tar.gz` to the home directory of user `deploy` on host `app.example.com`, using `scp`.",
          submissionType: "command",
          expectedPatterns: ["scp\\s+.*build\\.tar\\.gz", "deploy@app\\.example\\.com"],
          successFeedback:
            "`scp build.tar.gz deploy@app.example.com:~` copies the file over the same encrypted channel SSH uses — same `user@host` form you log in with.",
          reviewFeedback:
            "A working version is `scp build.tar.gz deploy@app.example.com:~`. `scp` uses the SSH `user@host:path` form; the `:~` targets the deploy user's home directory.",
        },
      ],
    },
  ],
};

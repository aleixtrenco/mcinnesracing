# Alex McInnes Racing website: project folder

Everything needed to keep working on the site, in any Claude account:

| Folder or file | What it is |
| --- | --- |
| `alex-mcinnes-site/` | The website. This is the folder you put online. |
| `CLAUDE.md` | Project memory: the brief, every decision so far, open items and how to check work. Claude reads it automatically when a session opens this folder from GitHub. |
| `.claude/skills/` | The two design skills used on the project (frontend-design, ui-ux-pro-max). |
| `dev/` | Test and preview tools. |
| `source/` | Original files: the pitch deck, the official partner logos, the Red Bull KTM badge, the full fonts, the original film, and the old deck crops of the hero and contact photos. |

## Move it to another Claude account

The conversation itself can't move between accounts, so the new Claude starts
without it. `CLAUDE.md` replaces it: it records what was agreed, and your files
carry everything else.

### Option A: GitHub (recommended)

The project lives in a GitHub repository, now
https://github.com/aleixtrenco/mcinnesracing. Every session starts from the
latest version, and changes are saved there instead of in a temporary
container. Steps 1 and 2 are done; for another Claude account, start at step 3.

1. On github.com, create an empty **private** repository, for example
   `alex-mcinnes-racing`.
2. Put this folder in it. Either:
   - ask Claude to push it, after you give the Claude GitHub App access to the
     repository at https://claude.ai/connect-github, or
   - push it with GitHub Desktop or git. GitHub's web upload takes at most 100
     files at a time, and this folder has about 350.
3. Sign in to the other Claude account, open https://claude.ai/connect-github,
   connect the same GitHub account and give the Claude GitHub App access to the
   repository.
4. Start a new Claude Code session with that repository selected, and say:
   "Read CLAUDE.md, then let's continue."

### Option B: upload the zip (no GitHub)

1. In the other account, start a Claude Code session.
2. Attach `alex-mcinnes-racing.zip` and say: "Unzip this, work inside
   alex-mcinnes-racing, read CLAUDE.md, and copy the skills in .claude/skills to
   ~/.claude/skills."
3. Cloud sessions are temporary, so at the end of every session ask for an
   updated zip and keep it.

### What doesn't move

- **The chat history.** CLAUDE.md covers what was agreed.
- **Connectors**, such as the Instagram analytics connector. Connect them again
  in the new account at https://claude.ai/customize/connectors, then start a
  new session.

## Put the site online and keep it up to date

Any static host works (see `alex-mcinnes-site/README.md`). With Netlify, which
is free to start, there are two ways:

### With GitHub (recommended)

Use the repository from Option A:

1. Sign in at https://app.netlify.com, choose to import an existing project
   from GitHub, and pick the repository.
2. Leave the build command empty and set the publish directory to
   `alex-mcinnes-site`.
3. The site goes live at a Netlify address straight away. Add
   `mcinnesracing.com` in the site's domain settings when it's ready.

From then on, every change saved to the repository goes live by itself:

- ask Claude, in a session with the repository selected, to make a change
  and push it (from either Claude account), or
- for a small text change, edit `alex-mcinnes-site/index.html` on github.com
  with the pencil icon. "Edit the text and numbers" in the site's README says
  where things are.

### Without GitHub

1. Sign in at https://app.netlify.com first, so the site stays yours, then
   drag the `alex-mcinnes-site` folder onto https://app.netlify.com/drop.
2. To update it: get a new zip from Claude, unzip it, open the site in
   Netlify, go to **Deploys** and drag the new `alex-mcinnes-site` folder onto
   it. The new version replaces the old one.

### Before you launch

- The site assumes the domain `mcinnesracing.com` and the address
  `partnerships@mcinnesracing.com`. Make sure both work, or ask Claude to swap
  in the real ones.
- The Dakar logo is a stand-in traced from the deck. Get the official file,
  and permission to use it, from the organiser (A.S.O.).
- Confirm the "Giving back" ideas in "A winner made in the UAE" with Alex.

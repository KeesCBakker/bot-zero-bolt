# bot-zero-bot

We have the following aims for this project:

- Use modern Slack Bolt API with TypeScript
- Support the Hubot Command Mapper (as we use it a lot within Wehkamp)
- Faster development than bot-zero, wich is based on Hubot

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE.md)

## Getting started

This project supports dev containers, so you don't have to install nodejs to your environment.

### App

If you don't have an app, create one like this:

1. Go to https://api.slack.com/apps?new_app=1
2. Choose _From an app manifest_
3. Select your workspace
4. Paste the following information in the _YAML_ tab:

```yml
display_information:
  name: Baymax
  description: Personal bot of Kees C. Bakker.
  background_color: "#3d001d"
features:
  app_home:
    home_tab_enabled: false
    messages_tab_enabled: true
    messages_tab_read_only_enabled: false
  bot_user:
    display_name: Baymax
    always_online: true
oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - chat:write
      - groups:read
      - groups:write
      - groups:history
      - im:read
      - im:write
      - im:history
      - mpim:read
      - mpim:write
      - mpim:history
      - users.profile:read
      - users:read
      - users:read.email
      - files:write
      - channels:history
settings:
  event_subscriptions:
    bot_events:
      - app_mention
      - message.channels
      - message.im
  interactivity:
    is_enabled: true
  org_deploy_enabled: false
  socket_mode_enabled: true
  token_rotation_enabled: false
```

5. Hit the create button
6. Install to worksapce

7. Goto https://api.slack.com/rtm#classic and click the Create a classic Slack app button.
8. Complete: Settings > Basic Information > Display Information Section.
9. Add legacy user: Features > App Home > First, add a legacy bot user > Add Legacy Bot User
10. Install: Settings > Install App > Install to Workspace, install the app and copy the `xoxb-` Slack token. (You might need an admin to approve.)
11. Copy `.example.env` to `.env` and add the Slack token to this file.
12. Open a terminal and navigate to your bot directory (dev container opens in the right directory).
13. Enter `npm install` to install the NodeJs packages.
14. Start the bot using `npm run dev`.
15. Enjoy!

Note: if you're using Ranger Desktop, you might encounter a mount error.
Please consult: https://github.com/microsoft/vscode-remote-release/issues/8172
It advises to downgrade `Dev Containers` to `0.266.1`.

## How to fork this project internally in Wehkamp

GitHub doesn't allow forks on the same organization which means you can't use the fork button for Wehkamp use. You can easily solve this by forking this manually.

Replace bot-zero-fork with your own repo and/or use https for cloning/remotes instead of ssh.

1. Create a new repo under wehkamp.
2. Clone bot-zero. `git clone git@github.com:wehkamp/bot-zero.git bot-zero-fork`
3. Cd into fork `cd bot-zero-fork`
4. Setup remotes.
   - `git remote remove origin`
   - `git remote add upstream git@github.com:wehkamp/bot-zero.git`
   - `git remote add origin git@github.com:wehkamp/bot-zero-fork.git`
   - `git push origin master`

You can now pull/push to your forked repo and the original bot-zero repo.

### Pulling/updating

If you want to pull updates from the original bot-zero repo upstream you may use the command: `git pull upstream master`. This will get all commits from bot-zero master in your current branch.

### Pushing

You can also push to the original bot-zero project with `git push upstream whateverbranch` and this will push all your commits to a branch on bot-zero. Be aware though, bot-zero is public and you may leak private info.

## Good to know

**Dev**<br/>
Start the bot with `npm run dev`. It will start a watcher that will inspect your typescript files. Whenever something is changed, the bot is restarted.
Add new scripts to the `src/scripts` directory. Every script have the following:

```js
module.exports = robot => {
  // your code goes here
}
```

**Docker**<br/>
If you want to run in Docker, execute the following:

```sh
docker build -t bot-zero .
docker run -e HUBOT_SLACK_TOKEN=xoxb-you-token-here -it bot-zero
```

Or, if you already have a `.env`, run Docker Compose:

```sh
docker-compose up --build --remove-orphans
```

**Packages** <br/>
We've included some packages:

- `node-fetch`: a modern HTTP client. Makes it easier to use promises of your HTTP requests.
- `dotenv`: allows you to store environment variables in the .env file in the root of the project.
- `hubot-command-mapper`: allows for the mapping of commands with parameters to the Hubot without the need for regular expressions.

## Tech

We're using the following stack:

- [x] Node.js
- [x] TypeScript
- [x] Bolt
- [x] NPM

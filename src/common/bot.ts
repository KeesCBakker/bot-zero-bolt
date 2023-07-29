import { App, LogLevel, SocketModeReceiver } from "@slack/bolt"
import { WebClient } from "@slack/web-api"
import { BoltHubotEmulator } from "./hubot/BoltHubotEmulator"
import { ProfileService } from "./slack/ProfileService"
import path from "path"

// The directory containing the ex-hubot-scripts
const scriptsDir = path.resolve(__dirname, "..", "scripts")

export async function start() {
  const logLevel = LogLevel[(process.env.LOG_LEVEL as keyof typeof LogLevel).toUpperCase()] || LogLevel.INFO

  // Initialize SocketModeReceiver with a token
  const receiver = new SocketModeReceiver({
    appToken: process.env.SLACK_APP_TOKEN as string,
    logLevel: logLevel
  })

  // Creates a new Bolt Slack App with the receiver
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver,
    logLevel: logLevel
  })

  await app.start()

  let info = await getBotInfo(app.client)
  let profiles = new ProfileService(app.client)

  let alias = ""
  if (process.env.BOT_ALIAS) {
    var bot = await profiles.findBot(process.env.BOT_ALIAS)
    alias = bot?.id
  }

  let robot = new BoltHubotEmulator(info.botName, info.botUserId, app, profiles, alias)

  robot.scan(scriptsDir)

  return {
    app,
    robot,
    info
  }
}

async function getBotInfo(client: WebClient) {
  const auth = await client.auth.test()
  const info = await client.bots.info({
    bot: auth.bot_id
  })

  return {
    botId: auth.bot_id,
    botUserId: info.bot.user_id,
    botName: auth.user,
    appId: info.bot.app_id,
    appUrl: "https://api.slack.com/apps/" + info.bot.app_id
  }
}

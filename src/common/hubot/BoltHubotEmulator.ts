import fs from "fs"
import Hubot from "hubot"
import path from "path"
import { App, SayFn } from "@slack/bolt"
import { escapeRegExp } from "hubot-command-mapper/dist/utils/regex"
import { HelpEmulator } from "./HelpEmulator"
import { Middleware, MiddlewareEmulator } from "./MiddlewareEmulator"
import { ProfileService } from "../ProfileService"
import { StringIndexed } from "@slack/bolt/dist/types/helpers"

type InternalMessage = Hubot.Message & {
  isDirect: boolean
}

function obsoleteException(name: string) {
  return `[${name}] This Hubot function is obsolete.`
}

function makeObsoleteFn(name: string) {
  return () => {
    throw obsoleteException(name)
  }
}

/* Emulates some of the features of Hubot, just to make it work
   with the Hubot Command Mapper package */
export class BoltHubotEmulator {
  private responses: {
    regex: RegExp
    callback: (msg: Hubot.Response) => void
  }[] = []
  private receiveMiddlewareHandler = new MiddlewareEmulator()
  private helpHandler: HelpEmulator

  constructor(
    public readonly name: string,
    private readonly botUserId: string,
    private readonly app: App<StringIndexed>,
    private readonly profiles: ProfileService,
    private readonly alias: string | null
  ) {
    this.helpHandler = new HelpEmulator(this.name)

    this.app.event("app_mention", async ({ event, say, context }) => {
      let text = event.text.replaceAll(`<@${this.botUserId}>`, `@${this.name}`)
      let msg: InternalMessage = {
        id: event.ts,
        room: event.channel,
        text,
        user: <any>{
          id: event.user,
          name: event.username
        },
        finish: () => {},
        isDirect: false
      }

      await this.invokeCallback(msg, say)
    })

    this.app.message(async ({ message, say }) => {
      const msg = message as any
      let isDirect = true

      if (msg.type == "message" && msg.channel_type != "im" && msg.text) {
        // TODO: fix alias
        let aliasUserId = `<@${this.alias}>`

        if (msg.text.startsWith(aliasUserId)) {
          msg.text = msg.text.replaceAll(aliasUserId, `@${this.name}`)
          msg.channel_type = "im"
          isDirect = false
        } else if (msg.text.startsWith(this.name + " ")) {
          // legacy behavior -- react to your name
          msg.text = "@" + msg.text
          msg.channel_type = "im"
          isDirect = false
        }
      }

      // TODO: build out this alias feature
      if (msg.type == "message" && msg.channel_type == "im" && msg.text) {
        // what if users mention the bot in the Message tab?
        // just replace the mention with the name
        let text = msg.text.replaceAll(`<@${this.botUserId}>`, `@${this.name}`)

        // no mention? just add the name
        if (!text.startsWith(`@${this.name}`)) {
          text = `@${this.name} ${text}`
        }

        let userId = (<any>message).user
        let profile = await this.profiles.resolve(userId)

        let im: InternalMessage = {
          id: message.ts,
          room: message.channel,
          text,
          user: {
            id: userId,
            name: profile.name,
            set: makeObsoleteFn("message.user.set"),
            get: makeObsoleteFn("message.user.get")
          },
          finish: () => {},
          isDirect
        }

        await this.invokeCallback(im, say)
      }
    })
  }

  helpCommands() {
    return this.helpHandler.helpCommands()
  }

  respond(regex: RegExp, callback: (msg: Hubot.Response) => void) {
    // prefix with bot name for safety
    regex = new RegExp("^@" + escapeRegExp(this.name) + " " + regex.source, regex.flags)
    this.responses.push({ regex, callback })
  }

  private async invokeCallback(msg: InternalMessage, say: SayFn) {
    var response: Hubot.Response = {
      message: msg,
      reply: (str: string) => {
        if (msg.isDirect) {
          say(str)
        } else {
          say(`<@${msg.user.id}>: ${str}`)
        }
      },
      emote: say,
      send: say,
      topic: makeObsoleteFn("response.topic"),
      play: makeObsoleteFn("response.play"),
      locked: makeObsoleteFn("response.locked"),
      random: makeObsoleteFn("response.random"),
      finish: makeObsoleteFn("response.finish"),
      match: <any>null,
      envelope: <any>null,
      http: makeObsoleteFn("response.http")
    }

    await this.receiveMiddlewareHandler.execute(response)

    let match = this.responses.find(x => x.regex.test(msg.text))
    if (!match) return

    response.match = <any>msg.text?.match(match.regex)
    match.callback(<any>response)
  }

  scan(scriptsDir: string) {
    // Read all files in the directory
    fs.readdirSync(scriptsDir).forEach(file => {
      const filePath = path.resolve(scriptsDir, file)
      // Ensure the file is a TypeScript file
      if (path.extname(filePath) === ".ts") {
        // Load and run the default export from the TypeScript file
        const script = require(filePath)
        script(this)

        this.helpHandler.parseHelp(filePath)
      }
    })
  }

  receiveMiddleware(m: Middleware) {
    this.receiveMiddlewareHandler.register(m)
  }
}

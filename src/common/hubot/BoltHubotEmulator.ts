import path, { resolve } from "path"
import fs from "fs"
import { StringIndexed } from "@slack/bolt/dist/types/helpers"
import { App, SayFn } from "@slack/bolt"
import Hubot from "hubot"
import { ProfileService } from "../ProfileService"
import { escapeRegExp } from "hubot-command-mapper/dist/utils/regex"
import { MiddlewareEmulator, Middleware } from "./MiddlewareEmulator"

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
  private commands: any[]
  private receiveMiddlewareHandler = new MiddlewareEmulator()

  constructor(
    public readonly name: string,
    private readonly botUserId: string,
    private readonly app: App<StringIndexed>,
    private readonly profiles: ProfileService,
    private readonly alias: string | null
  ) {
    this.commands = []

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
    return this.commands.sort()
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

        this.parseHelp(filePath)
      }
    })
  }

  receiveMiddleware(m: Middleware) {
    this.receiveMiddlewareHandler.register(m)
  }

  // airlifted the code from the Hubot project:
  // https://github.com/hubotio/hubot/blob/5f21da90a01295967cc555f5e23314be4c755f35/src/robot.js#L535-L583
  private parseHelp(path: string) {
    function toHeaderCommentBlock(block, currentLine) {
      if (!block.isHeader) {
        return block
      }

      if (isCommentLine(currentLine)) {
        block.lines.push(removeCommentPrefix(currentLine))
      } else {
        block.isHeader = false
      }

      return block
    }
    function isCommentLine(line) {
      return /^(#|\/\/)/.test(line)
    }

    function removeCommentPrefix(line) {
      return line.replace(/^[#/]+\s*/, "")
    }

    const HUBOT_DOCUMENTATION_SECTIONS = [
      "description",
      "dependencies",
      "configuration",
      "commands",
      "notes",
      "author",
      "authors",
      "examples",
      "tags",
      "urls"
    ]

    const scriptDocumentation = {
      commands: []
    }
    const body = fs.readFileSync(require.resolve(path), "utf-8")

    const useStrictHeaderRegex = /^["']use strict['"];?\s+/
    const lines = body
      .replace(useStrictHeaderRegex, "")
      .split(/(?:\n|\r\n|\r)/)
      .reduce(toHeaderCommentBlock, { lines: [], isHeader: true })
      .lines.filter(Boolean) // remove empty lines
    let currentSection = null
    let nextSection

    for (let i = 0, line; i < lines.length; i++) {
      line = lines[i]

      if (line.toLowerCase() === "none") {
        continue
      }

      nextSection = line.toLowerCase().replace(":", "")
      if (Array.from(HUBOT_DOCUMENTATION_SECTIONS).indexOf(nextSection) !== -1) {
        currentSection = nextSection
        scriptDocumentation[currentSection] = []
      } else {
        if (currentSection) {
          scriptDocumentation[currentSection].push(line)
          if (currentSection === "commands") {
            this.commands.push(line)
          }
        }
      }
    }

    if (currentSection === null) {
      scriptDocumentation.commands = []
      for (let i = 0, line, cleanedLine; i < lines.length; i++) {
        line = lines[i]
        if (line.match("-")) {
          continue
        }

        cleanedLine = line
          .slice(2, +line.length + 1 || 9e9)
          .replace(/^hubot/i, this.name)
          .trim()
        scriptDocumentation.commands.push(cleanedLine)
        this.commands.push(cleanedLine)
      }
    }
  }
}




import fs from "fs"

// airlifted the code from the Hubot project:
// https://github.com/hubotio/hubot/blob/5f21da90a01295967cc555f5e23314be4c755f35/src/robot.js#L535-L583

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

export class HelpEmulator {
  private commands = []
  private name: string

  constructor(botName: string) {
    this.name = botName
  }

  parseHelp(path: string) {
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
          .replace(/^hubot/i, "- @" + this.name)
          .trim()
        scriptDocumentation.commands.push(cleanedLine)
        this.commands.push(cleanedLine)
      }
    }
  }

  helpCommands() {
    return this.commands.sort()
  }
}

function toHeaderCommentBlock(block: { isHeader: boolean; lines: string[] }, currentLine: string) {
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
function isCommentLine(line: string) {
  return /^(#|\/\/)/.test(line)
}

function removeCommentPrefix(line: string) {
  return line.replace(/^[#/]+\s*/, "")
}

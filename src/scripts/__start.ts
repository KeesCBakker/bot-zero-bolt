// Description:
//  Scripts that should be executed first.
//
// Author:
//  KeesCBakker

import removeMarkDown from "remove-markdown"

import {
  removeTrailingWhitespaceCharactersFromIncomingMessages,
  removeTrailingBotWhitespaceCharactersFromIncomingMessages,
} from "hubot-command-mapper"
import Hubot from "hubot"

module.exports = async (robot: Hubot.Robot) => {
  
  // make sure command mapper behaves
  removeMarkdownFromInput(robot)
  removeTrailingWhitespaceCharactersFromIncomingMessages(robot)
  removeTrailingBotWhitespaceCharactersFromIncomingMessages(robot)
}

export function removeMarkdownFromInput(robot: Hubot.Robot) {
  if (!robot) throw "Argument 'robot' is empty."

  robot.receiveMiddleware((context, next, done) => {
    const text = context.response.message.text
    if (text) {
      let newText = removeMarkDown(text)
      if (text != newText) {
        context.response.message.text = newText
      }
    }

    next(done)
  })
}

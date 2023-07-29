import Hubot from "hubot"
import { RestParameter, map_command } from "hubot-command-mapper"

module.exports = (robot: Hubot.Robot) => {
  map_command(robot, "help", new RestParameter("filter", ""), context => {
    let cmds = getHelpCommands(robot)

    let { filter } = context.values
    let msg = context.res

    if (filter) {
      cmds = cmds.filter(cmd => cmd.match(new RegExp(filter, "i")))
      if (cmds.length === 0) {
        msg.reply(`Sorry, no available commands match _${filter}_`)
        return
      }
    }

    const emit = cmds.join("\n")
    return msg.reply("I found the following help:\n" + emit)
  })
}

function getHelpCommands(robot: Hubot.Robot) {
  let helpCommands = robot.helpCommands()

  const robotName = "- @" + robot.name

  helpCommands = helpCommands.map(command => {
    if (robotName.length === 1) {
      return command.replace(/^hubot\s*/i, robotName)
    }

    return command.replace(/^hubot/i, robotName)
  })

  return helpCommands.sort()
}

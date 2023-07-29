import dotenv from "dotenv"
import { validateConfg } from "./env"
import { asciiArtChalker, chalker } from "chalk-with-markers"
import * as bot from "./common/bot"

dotenv.config()
validateConfg()

// start bot async
;(async () => {
  let { info } = await bot.start()

  splash()

  console.log(
    // debug info
    chalker.colorize(`
[q]Bot name: [y]@${info.botName}
[q]App URL:  [y]${info.appUrl}
[q]Version:  [y]${process.env.npm_package_version}
[q]PID:      [y]${process.pid}

[g]Started!`)
  )
})()

function splash() {
  console.log(
    asciiArtChalker.colorize(`
ppp__________        __    __________                    
b\\______   \\ _____/  |_  \\____    /___________  bbb____  
cc |    |  _//  _ \\   __\\   /     // __ \\_  __ \\/  _ \\ 
pp |    |   (  <_> )  |    pp/     /p\\  ___/|  | \\(  <_> ) 
b |______  /\\____/|__|   pp/_______b \\___  >__|   \\____/
ccc        \\/            c          \\/   \\/                        
  `)
  )

  console.log("⚡ Powered with Slack Bolt + Hubot Command Mapper ⚡")
}

import { WebClient } from "@slack/web-api"

const cache: Record<string, Profile> = {}

type Profile = {
  id: string
  name: string
  email: string
  fullName: string
}
interface Bot {
  id: string
  name: string
}

export class ProfileService {
  constructor(private webClient: WebClient) {}

  async resolve(userId: string): Promise<Profile | null> {
    let profile = cache[userId]
    if (profile) return profile

    try {
      const slackUser = await this.webClient.users.profile.get({ user: userId })
      profile = {
        id: userId,
        email: slackUser.profile.email,
        fullName: slackUser.profile.real_name,
        name: slackUser.profile.email.replace(/@.*$/, "")
      }

      cache[userId] = profile
      return profile
    } catch (ex) {
      console.log('DO YOU HAVE PERMISSION "users.profile:read" AND "users.profile:email"?', ex, ex.stack)
    }

    return null
  }

  async findBot(name: string): Promise<Bot | null> {
    try {
      let cursor: string | undefined = undefined

      while (true) {
        const result = await this.webClient.users.list({ cursor })

        const bot = result.members
          .filter(user => user.is_bot || user.is_app_user)
          .map(user => ({ id: user.id, name: user.name }))
          .find(x => x.name == name)

        if (bot) return bot

        if (result.response_metadata && result.response_metadata.next_cursor) {
          cursor = result.response_metadata.next_cursor
        } else {
          break
        }
      }
    } catch (ex) {
      console.log('DO YOU HAVE PERMISSION "users:read"?', ex, ex.stack)
      return null
    }

    return null
  }
}

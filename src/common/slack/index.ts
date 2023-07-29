import { WebClient, FilesUploadArguments } from "@slack/web-api"

export function createWebClient(token?: string): WebClient {
  token = token || (process.env.SLACK_BOT_TOKEN as string)
  return new WebClient(token)
}

export function upload(
  comment: string,
  fileName: string,
  channel: string,
  data: Buffer | string,
  thread_ts?: string,
  filetype?: string,
  token?: string
) {
  let options: FilesUploadArguments = {
    filename: fileName,
    channel_id: channel,
    initial_comment: comment,
    title: fileName
  }

  if (data instanceof Buffer) {
    options.file = data
  } else {
    options.content = data
    options.filetype = filetype
  }

  if (thread_ts != null) {
    options.thread_ts = thread_ts.toString()
  }

  return createWebClient(token).files.uploadV2(options)
}

import Anthropic from '@anthropic-ai/sdk'

let client = null

function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured on the server.')
    }
    client = new Anthropic()
  }
  return client
}

export async function sendChatMessage(messages) {
  const response = await getClient().messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    messages,
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  return textBlock?.text || ''
}

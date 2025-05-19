export async function sendDM(client, userId, content) {
  const user = await client.users.fetch(userId);
  return user.send({ content, allowedMentions: { parse: [] } });
}

export async function sendChannel(client, channelId, content) {
  const channel = await client.channels.fetch(channelId);
  return channel.send({ content, allowedMentions: { parse: ['users'] } });
}

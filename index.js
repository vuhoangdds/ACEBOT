
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const app = express();
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: ['CHANNEL']
});

const token = process.env.DISCORD_TOKEN;

client.once('ready', () => {
  console.log('✅ Bot đã online!');
});

client.on('messageCreate', async message => {
  if (message.content === '!ping') {
    return message.reply('Pong! 🏓');
  }
  
  if (message.content.startsWith('!send')) {
    const parts = message.content.split(' ');
    const userId = parts[1];
    const content = parts.slice(2).join(' ');

    try {
      const user = await client.users.fetch(userId);
      await user.send(content);
      message.reply(`✅ Đã gửi DM cho <@${userId}>`);
    } catch (err) {
      console.error('❌ Gửi DM lỗi:', err);
      message.reply(`❌ Không gửi được DM cho <@${userId}>: ${err.message}`);
    }
  }
});

// Add webhook endpoint
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Bot server is running!');
});

app.post('/send_dm', async (req, res) => {
  const { userId, content } = req.body;
  
  try {
    const user = await client.users.fetch(userId);
    await user.send(content);
    console.log(`✅ Đã gửi DM cho ${user.tag}`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Lỗi gửi DM:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Start server
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server đang chạy ở port ${PORT}`);
});

client.login(token);

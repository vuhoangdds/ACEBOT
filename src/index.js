import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';
import config from './config.js';
import interactionsRoute from './routes/interactions.js';
import webhooksRoute from './routes/webhooks.js';

const app = express();
app.use(express.json({ verify: (req, res, buf) => req.rawBody = buf }));

// khởi bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: ['CHANNEL']
});
client.login(config.DISCORD.TOKEN);
app.set('discordClient', client);

// routes
app.use('/interactions', interactionsRoute);
app.use('/', webhooksRoute);

app.get('/', (req, res) => res.send('Bot server is running!'));
app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`🚀 Server chạy ở port ${config.PORT}`);
});

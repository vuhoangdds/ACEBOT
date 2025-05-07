import { REST, Routes } from 'discord.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

const commands = [
  {
    name: 'ping',
    description: 'Kiểm tra bot online',
    dm_permission: true,
  },
  {
    name: 'ace',
    description: 'Xem điểm ACE hiện tại',
    dm_permission: true,
  }
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🚀 Đăng ký slash command (global)...');
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    console.log('✅ Đăng ký slash command thành công!');
  } catch (error) {
    console.error('❌ Lỗi đăng ký slash command:', error);
  }
})();

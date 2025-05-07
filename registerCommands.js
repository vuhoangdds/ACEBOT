import { REST, Routes } from 'discord.js';
import 'dotenv/config';

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
  },
  {
    name: 'ma',
    description: 'Tra cứu mã lỗi/thưởng',
    dm_permission: true,
    options: [
      {
        name: 'maloai',
        description: 'Nhập mã (ví dụ: CM-01)',
        type: 3, // string
        required: true
      }
    ]
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Đang đăng ký slash command...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Đăng ký slash command thành công.');
  } catch (error) {
    console.error('❌ Lỗi đăng ký:', error);
  }
})();

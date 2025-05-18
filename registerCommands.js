import { REST, Routes } from 'discord.js';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [
  {
    name: 'ping',
    description: 'Kiểm tra bot online hay không'
  },
  {
    name: 'ma',
    description: 'Tra cứu mã điểm thưởng/điểm lỗi',
    options: [
      {
        name: 'code',
        description: 'Mã cần tra cứu (ví dụ: CM-01)',
        type: 3, // STRING
        required: true
      }
    ]
  },
  {
    name: 'ace',
    description: 'Xem điểm ACE của chính bạn'
  },
  {
    name: 'duyet',
    description: 'Duyệt đơn xin phép',
    options: [
      {
        name: 'id',
        description: 'ID đơn cần duyệt (từ dòng 2 trở đi)',
        type: 4, // INTEGER
        required: true
      }
    ]
  },
  {
    name: 'tuchoi',
    description: 'Từ chối đơn xin phép',
    options: [
      {
        name: 'id',
        description: 'ID đơn cần từ chối (từ dòng 2 trở đi)',
        type: 4, // INTEGER
        required: true
      }
    ]
  }
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Đang đăng ký GLOBAL Slash Commands...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Đăng ký Slash Commands GLOBAL thành công!');
  } catch (err) {
    console.error('❌ Lỗi đăng ký command:', err);
  }
})();

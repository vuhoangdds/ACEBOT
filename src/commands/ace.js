// src/commands/ace.js
import { getAceByDiscordId } from '../services/sheetsService.js';

export const ace = {
  name: 'ace',
  async execute(interaction) {
    const userId = interaction.member?.user?.id || interaction.user.id;
    const info = await getAceByDiscordId(userId);
    if (!info) return { content: '❌ Không tìm thấy Discord ID của bạn.' };
    return {
      content: `📊 Thông tin ACE của **${info.ten}**:\n` +
               `• Điểm ACE hiện tại: **${info.diem}**\n` +
               `• Số tháng làm việc: **${info.thang}**\n` +
               `• Tổng điểm 6 tháng: **${info.tong6thang}**`
    };
  }
};

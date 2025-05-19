// tra cứu mã điểm thưởng/điểm lỗi
import { lookupCode } from '../services/sheetsService.js';

export const ma = {
  name: 'ma',
  description: 'Tra cứu mã điểm thưởng/điểm lỗi',
  dm_permission: true,
  options: [
    {
      name: 'code',
      description: 'Mã cần tra cứu (ví dụ: CM-01)',
      type: 3, // STRING
      required: true
    }
  ],
  async execute(interaction) {
    const code = interaction.options.getString('code');
    const desc = await lookupCode(code);
    if (!desc) {
      return { content: `❌ Không tìm thấy mã **${code.toUpperCase()}**.` };
    }
    return { content: `📄 Mã **${code.toUpperCase()}**: ${desc}` };
  }
};

// xử lý /duyet và /tuchoi chung
import fetch from 'node-fetch';
import config from '../config.js';

export const duyet = {
  name: 'duyet',
  description: 'Duyệt đơn xin phép',
  dm_permission: true,
  options: [
    {
      name: 'id',
      description: 'ID đơn cần duyệt (từ dòng 2 trở đi)',
      type: 4, // INTEGER
      required: true
    }
  ],
  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const payload = {
      action: 'duyet',
      id,
      discordUserId: interaction.user.id
    };
    try {
      const res = await fetch(config.WEBAPP_URL, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      return { content: text };
    } catch (err) {
      console.error(err);
      return { content: '❌ Gặp lỗi khi gọi webhook duyệt đơn.' };
    }
  }
};

export const tuchoi = {
  name: 'tuchoi',
  description: 'Từ chối đơn xin phép',
  dm_permission: true,
  options: [
    {
      name: 'id',
      description: 'ID đơn cần từ chối (từ dòng 2 trở đi)',
      type: 4, // INTEGER
      required: true
    }
  ],
  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const payload = {
      action: 'tuchoi',
      id,
      discordUserId: interaction.user.id
    };
    try {
      const res = await fetch(config.WEBAPP_URL, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      return { content: text };
    } catch (err) {
      console.error(err);
      return { content: '❌ Gặp lỗi khi gọi webhook từ chối đơn.' };
    }
  }
};

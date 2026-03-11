import api from './api';

export const chat = {
  // Получить историю чата
  getHistory: (limit: number = 15) => 
    api.get(`/chat/history?limit=${limit}`),
  
  // Сохранить сообщение
  saveMessage: (message: string, botResponse: string) =>
    api.post('/chat/save', { message, botResponse })
};

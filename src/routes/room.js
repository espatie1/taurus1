// src/routes/room.js
const express = require('express');
const router = express.Router();
const {
  createRoom,
  getRoom,
  listRooms,
  nextVideo,
  removeVideo,
  updateRoom,
  deleteRoom
} = require('../controllers/roomController');
const auth = require('../middleware/auth');

// Получение списка всех комнат
router.get('/', listRooms);

// Создание комнаты
router.post('/create', auth, createRoom);

// Получение информации по конкретной комнате
router.get('/:id', getRoom);

// Переход к следующему видео (для хоста)
router.post('/:id/next', auth, nextVideo);

// Удаление видео из очереди (для хоста)
router.delete('/:id/video/:videoId', auth, removeVideo);

// Обновление настроек комнаты (для хоста)
router.put('/:id', auth, updateRoom);

// Удаление комнаты (для хоста)
router.delete('/:id', auth, deleteRoom);

module.exports = router;

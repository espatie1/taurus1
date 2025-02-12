// src/controllers/roomController.js
const Room = require('../models/Room');
const Video = require('../models/Video');

exports.createRoom = async (req, res) => {
  const { name, allowAllControl } = req.body;
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ msg: 'Пользователь не авторизован' });
    }
    const room = new Room({
      name: name || 'Новая комната',
      host: req.user.id,
      participants: [req.user.id],
      settings: { allowAllControl: allowAllControl !== undefined ? allowAllControl : true }
    });
    await room.save();
    res.json(room);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Ошибка сервера' });
  }
};

exports.getRoom = async (req, res) => {
    const roomId = req.params.id;
    try {
      const room = await Room.findById(roomId)
        .populate('host', 'username email _id')
        .populate('participants', 'username email')
        .populate('queue')
        .populate({ path: 'playerStatus.currentVideo', select: 'url' }); // добавлено populate для текущего видео
      if (!room) {
        return res.status(404).json({ msg: 'Комната не найдена' });
      }
      res.json(room);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: 'Ошибка сервера' });
    }
  };
  

exports.listRooms = async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate('host', 'username')
      .lean();
    const roomsFormatted = rooms.map(room => ({
      id: room._id,
      name: room.name,
      host: room.host.username,
      participantsCount: room.participants.length,
      currentVideo: room.playerStatus.currentVideo
    }));
    res.json(roomsFormatted);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Ошибка сервера' });
  }
};

// Переход к следующему видео (только для хоста)
exports.nextVideo = async (req, res) => {
    const roomId = req.params.id;
    try {
      const room = await Room.findById(roomId);
      if (!room) return res.status(404).json({ msg: "Комната не найдена" });
      if (room.host.toString() !== req.user.id) {
        return res.status(403).json({ msg: "Только хост может переключать видео" });
      }
      if (room.queue.length > 0) {
        // Извлекаем следующее видео из очереди
        const nextVideoId = room.queue.shift();
        const nextVideo = await Video.findById(nextVideoId);
        // Сохраняем _id видео (так как поле ожидает ObjectId)
        room.playerStatus.currentVideo = nextVideo._id;
        await room.save();
        return res.json({ msg: "Переключено на следующее видео", currentVideo: nextVideo, queue: room.queue });
      } else {
        room.playerStatus.currentVideo = null;
        await room.save();
        return res.json({ msg: "Очередь пуста, текущее видео сброшено", queue: room.queue });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Ошибка сервера" });
    }
  };
  
  exports.updateCurrentVideo = async (req, res) => {
    const roomId = req.params.id;
    const { currentVideo } = req.body; // ожидается _id видео, которое должно стать текущим
    try {
      const room = await Room.findById(roomId);
      if (!room) return res.status(404).json({ msg: "Комната не найдена" });
      // Только хост может обновлять текущее видео
      if (room.host.toString() !== req.user.id) {
        return res.status(403).json({ msg: "Только хост может обновлять текущее видео" });
      }
      room.playerStatus.currentVideo = currentVideo;
      await room.save();
      res.json({ msg: "Текущее видео обновлено", room });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Ошибка сервера" });
    }
  };
  

// Удаление видео из очереди (только для хоста)
exports.removeVideo = async (req, res) => {
  const { id, videoId } = req.params; // id — идентификатор комнаты, videoId — удаляемого видео
  try {
    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ msg: "Комната не найдена" });
    if (room.host.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Только хост может удалять видео из очереди" });
    }
    const initialLength = room.queue.length;
    room.queue = room.queue.filter(v => v.toString() !== videoId);
    if (room.queue.length === initialLength) {
      return res.status(404).json({ msg: "Видео не найдено в очереди" });
    }
    await room.save();
    res.json({ msg: "Видео удалено из очереди", queue: room.queue });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Ошибка сервера" });
  }
};

// Обновление настроек комнаты (например, изменение названия или параметра allowAllControl) – только для хоста
// src/controllers/roomController.js
// Функция обновления настроек комнаты (только для хоста)
exports.updateRoom = async (req, res) => {
    const roomId = req.params.id;
    // Ожидаем данные: name, autoNext, allowAllControl
    const { name, autoNext, allowAllControl } = req.body;
    try {
      const room = await Room.findById(roomId);
      if (!room) return res.status(404).json({ msg: "Комната не найдена" });
      if (room.host.toString() !== req.user.id) {
        return res.status(403).json({ msg: "Только хост может обновлять настройки комнаты" });
      }
      if (name) room.name = name;
      if (typeof autoNext !== 'undefined') room.settings.autoNext = autoNext;
      if (typeof allowAllControl !== 'undefined') room.settings.allowAllControl = allowAllControl;
      await room.save();
      res.json({ msg: "Настройки обновлены", room });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Ошибка сервера" });
    }
  };
  

// Удаление комнаты (только для хоста)
exports.deleteRoom = async (req, res) => {
  const roomId = req.params.id;
  try {
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ msg: "Комната не найдена" });
    if (room.host.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Только хост может удалить комнату" });
    }
    await Room.findByIdAndDelete(roomId);
    res.json({ msg: "Комната удалена" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Ошибка сервера" });
  }
};

// src/controllers/videoController.js
const Video = require('../models/Video');
const Room  = require('../models/Room');
const { extractYouTubeId } = require('../utils');

exports.addVideo = async (req, res) => {
    // Ожидаются данные: roomId, type, url, title (опционально), duration (опционально)
    // req.user должен быть установлен middleware аутентификации
    const { roomId, type, url, title, duration } = req.body;
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ msg: 'Пользователь не авторизован' });
        }

        // Проверяем, существует ли комната
        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(404).json({ msg: 'Комната не найдена' });
        }

        // Создаем видео, сохраняя только YouTube ID (если это ссылка)
        const video = new Video({
            type,
            url: extractYouTubeId(url),
            title: title || '',
            duration: duration || 0,
            addedBy: req.user.id
        });
        await video.save();

        // Добавляем видео в очередь комнаты
        room.queue.push(video._id);
        // Если текущее видео не установлено, устанавливаем его как только что добавленное видео
        if (!room.playerStatus.currentVideo) {
            room.playerStatus.currentVideo = video._id;
        }
        await room.save();

        res.json({ msg: 'Видео добавлено в очередь', video });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Ошибка сервера' });
    }
};


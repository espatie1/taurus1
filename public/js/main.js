// /public/js/main.js

// Инициализация Socket.io
const socket = io();

// Предположим, что идентификатор комнаты передаётся через URL или заранее известен
const roomId = 'exampleRoomId';

// Функция для подключения к комнате
socket.emit('joinRoom', roomId);

// Обработка события, когда новый пользователь присоединяется к комнате
socket.on('userJoined', (data) => {
    console.log(`Новый участник: ${data.socketId}`);
});

// Обработка синхронизации плеера
socket.on('syncPlayer', (data) => {
    console.log('Синхронизация плеера', data);
    if (player && typeof player.seekTo === 'function') {
        player.seekTo(data.timestamp, true);
        if (data.action === 'play') {
            player.playVideo();
        } else if (data.action === 'pause') {
            player.pauseVideo();
        }
    }
});

// YouTube IFrame API: создание плеера
let player;
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '390',
        width: '640',
        videoId: 'dQw4w9WgXcQ', // Пример видео. В реальном случае ID будет динамическим.
        events: {
            'onReady': onPlayerReady
        }
    });
}

function onPlayerReady(event) {
    // Пример: можно добавить слушатели кнопок после инициализации плеера
    document.getElementById('playBtn').addEventListener('click', () => {
        player.playVideo();
        socket.emit('playerAction', {
            roomId,
            action: 'play',
            timestamp: player.getCurrentTime()
        });
    });
    document.getElementById('pauseBtn').addEventListener('click', () => {
        player.pauseVideo();
        socket.emit('playerAction', {
            roomId,
            action: 'pause',
            timestamp: player.getCurrentTime()
        });
    });
    document.getElementById('rewindBtn').addEventListener('click', () => {
        // Пример: перематываем на 10 секунд назад
        const newTime = Math.max(player.getCurrentTime() - 10, 0);
        player.seekTo(newTime, true);
        socket.emit('playerAction', {
            roomId,
            action: 'rewind',
            timestamp: newTime
        });
    });
}

// Экспортируем onYouTubeIframeAPIReady в глобальную область видимости
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

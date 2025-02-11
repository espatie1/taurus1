// server.js
const express    = require('express');
const http       = require('http');
const socketIo   = require('socket.io');
const path       = require('path');
const morgan     = require('morgan');
const cors       = require('cors');
const { connectDB } = require('./config/db');

// Инициализация Express-приложения
const app    = express();
const server = http.createServer(app);
const io     = socketIo(server);

// Подключение к базе данных MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cors());

// Раздача статических файлов из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Подключение API маршрутов
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/rooms', require('./src/routes/room'));   // файлы для комнат можно добавить позже
app.use('/api/videos', require('./src/routes/video'));   // файлы для видео – позже

// Обработка событий Socket.io
io.on('connection', socket => {
    console.log(`Новое подключение: ${socket.id}`);
    // Подключаем модуль для работы с комнатами (базовая реализация)
    require('./src/sockets/roomSocket')(io, socket);
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));

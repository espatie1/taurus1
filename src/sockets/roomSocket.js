// src/sockets/roomSocket.js
module.exports = (io, socket) => {
    // Обработка события присоединения к комнате
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} присоединился к комнате ${roomId}`);
        io.to(roomId).emit('userJoined', { socketId: socket.id });
    });

    // Обработка управления плеером (например, пауза, воспроизведение, перемотка)
    socket.on('playerAction', (data) => {
        io.to(data.roomId).emit('syncPlayer', data);
    });

    // Добавляем новый обработчик события для смены видео
    socket.on('videoChanged', (data) => {
        // data должно содержать roomId и videoId
        io.to(data.roomId).emit('videoChanged', data);
    });

    socket.on('disconnect', () => {
        console.log(`Socket ${socket.id} отключился`);
    });
};

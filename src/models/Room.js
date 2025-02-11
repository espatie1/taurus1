// src/models/Room.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RoomSchema = new Schema({
  name: {
    type: String,
    required: true,
    default: 'Новая комната'
  },
  host: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  playerStatus: {
    currentTime: {
      type: Number,
      default: 0
    },
    isPlaying: {
      type: Boolean,
      default: false
    },
    // Храним ID видео из коллекции Video
    currentVideo: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      default: null
    }
  },
  queue: [{
    type: Schema.Types.ObjectId,
    ref: 'Video'
  }],
  settings: {
    allowAllControl: {
      type: Boolean,
      default: true
    },
    autoNext: {           // Новая настройка: автоматический переход на следующее видео
      type: Boolean,
      default: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Room', RoomSchema);

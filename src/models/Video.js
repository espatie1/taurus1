// src/models/Video.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VideoSchema = new Schema({
    type: {
        type: String,
        enum: ['youtube', 'file'],
        required: true
    },
    url: {
        type: String,
        required: true
    },
    title: {
        type: String,
        default: ''
    },
    duration: {
        type: Number,
        default: 0
    },
    addedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Video', VideoSchema);

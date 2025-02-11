// src/routes/video.js
const express = require('express');
const router = express.Router();
const { addVideo } = require('../controllers/videoController');
const auth = require('../middleware/auth');


// Эндпоинт для добавления видео в очередь
router.post('/add', auth, addVideo);

module.exports = router;

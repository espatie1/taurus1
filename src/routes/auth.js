// src/routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const auth = require('../middleware/auth');

// Регистрация и вход
router.post('/register', register);
router.post('/login', login);

// Получение данных текущего пользователя
router.get('/me', auth, async (req, res) => {
  const User = require('../models/User');
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Ошибка сервера' });
  }
});

module.exports = router;

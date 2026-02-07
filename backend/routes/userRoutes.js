const express = require('express');
const { searchUsersBySkill } = require('../controllers/userController');

const router = express.Router();

router.get('/search', searchUsersBySkill);

module.exports = router;

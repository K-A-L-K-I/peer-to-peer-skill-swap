const express = require('express');
const { getAllSkills, getCategories } = require('../controllers/skillController');

const router = express.Router();

router.get('/', getAllSkills);
router.get('/categories', getCategories);

module.exports = router;

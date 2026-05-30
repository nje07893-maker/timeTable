const express = require('express');
const router = express.Router();
const settings = require('../models/Settings');

router.get('/', (req, res) => {
  res.json(settings.get());
});

router.put('/', (req, res) => {
  const updated = settings.update(req.body);
  res.json(updated);
});

module.exports = router;

var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('play/play');
});

module.exports = router;


var api = require('../apiclient');

/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Express' })
};


exports.getStockQuotes = function(req, res){
	res.writeHead(200, {'Content-Type': 'application/json'});
 	res.end(JSON.stringify(api.getStockQuotes()));
};

exports.getFtseGainers = function(req, res){
	res.writeHead(200, {'Content-Type': 'application/json'});
 	res.end(JSON.stringify(api.getFtseGainers()));
};
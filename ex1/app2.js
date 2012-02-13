var http = require('http'),
	myModule = require('./module'); 


var myServer = http.createServer();

myServer.on('request', function (req, res) {

	var info = myModule.doExamination(req);

	res.writeHead(200, {'Content-Type': 'application/json'});
	res.write(JSON.stringify(info));
	res.end();
});

myServer.listen(3000, "192.168.1.7");

console.log('Server running at http://192.168.1.7:3000');



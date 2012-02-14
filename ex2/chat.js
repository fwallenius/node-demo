var allSockets = {};
var io = null;

exports.setIo = function (_io) {
	io = _io;	
};

exports.onSocket = function (socket) {
	socket.userName = socket.id + "";
	allSockets["" + socket.id] = socket;

	io.sockets.emit('CONNECTED', userInfo());	
	socket.on('disconnect', onDisconnect);
	socket.on('CHATMSG', relayChatMessage);
};

var onDisconnect = function () {
	delete allSockets["" + this.id];
	io.sockets.emit('CONNECTED', userInfo());	
};

var relayChatMessage = function (data) { 
	io.sockets.emit('INCMSG', {
		userId: 	this.id,
		userName: 	this.userName,
		message: 	data.text 
	});	
};

var userInfo = function () {
	var data = [], index;

	for (index in allSockets) {
		data.push({
			id: 	allSockets[index].id,
			name: 	allSockets[index].userName
		});
	}
	return data;
};



var socket = io.connect();


socket.on('CONNECTED', function (data) {

	var html = '', index;
	for (index in data) {
		html += '<li>' + data[index].name + '</li>';
	}

	$('#users').html(html);

});

socket.on('INCMSG', function (data) {
	var html = '<p><span class="userName ' + data.userId + '">' + data.userName + ': </span> ' + data.message + '</p>';
	$('#chatMessages').append(html);
	$('#chatMessages').scrollTop(40000);  // <- ugly hack, but this demo is not about smooth client design
});


var sendMessage = function (el) {
	socket.emit('CHATMSG', { text: $(el).val() });
	$(el).val('');
}
	

$(document).ready(function() {
	$('#textInput').keyup(function(event) {
		if (event.keyCode === 13) {
			sendMessage($('#textInput'));
		}
	});	
});


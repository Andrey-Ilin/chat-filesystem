(function(){
    var socket = new io("ws://andreyilin-chatplusfiles.rhcloud.com:8000");
    var messageForm = document.getElementById('messageForm');
    var message = document.getElementById('message');
    var chat = document.getElementById('chat');
    var messageArea = document.getElementById('messageArea');
    var userForm = document.getElementById('userForm');
    var userFormArea = document.getElementById('userFormArea');
    console.log(userFormArea);


    var users = document.getElementById('users');
    var nick = document.getElementById('nick');

    messageArea.hidden = true;

    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        socket.emit('send message' , message.value);
        chat.scrollTop = chat.scrollHeight;
        console.log(chat.scrollTop + " " + chat.scrollHeight);
        message.value = '';
    });

    userForm.addEventListener('submit', function(e) {
        e.preventDefault();
        socket.emit('new user', nick.value, function(data) {
            if (data) {
                userFormArea.hidden = true;
                messageArea.hidden = false;
            }
        });
        nick.value = '';
    });

    socket.on('new message' , function(data) {
        if (!data.msg) {
            return;
        }
        var div = document.createElement('div');
        div.setAttribute('class', 'well');
        div.innerHTML = "<strong>" + data.user + "</strong>"+ ': ' + data.msg;
        chat.appendChild(div);
    });

    socket.on('get users', function(data) {
        var html = "";

        for (var i = 0; i < data.length; i++) {
            html += "<li class='list-group-item'>" + data[i] +"</li>"
        }
        users.innerHTML = html;
    });

    socket.on('get messages', function(data) {
        var html = "";

        for (var i = 0; i < data.length; i++) {
            html += "<div class='well'>" + "<strong>" + data[i].user + "</strong>" + ': ' + data[i].msg +"</div>"
        }
        chat.innerHTML = html;
    })
})();
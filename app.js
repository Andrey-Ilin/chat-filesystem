'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('client-sessions');
var bcrypt = require('bcryptjs');
var csurf = require('csurf');

var path = require('path');



var Schema = mongoose.Schema;
var ObjectId = mongoose.Schema.Types.ObjectId;


var User = mongoose.model('User', new Schema({
    id: ObjectId,
    firstName: String,
    secondName: String,
    email: {type: String, unique: true},
    password: String
}));

var app = express();

var server = require('http').Server(app);
var io = require('socket.io')(server, {'transports': ['websocket', 'polling']});
var users = [];
var connection = [];
var messages = [];

var ip = process.env.OPENSHIFT_NODEJS_IP;
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;

server.listen(port, ip || 'localhost', function () {
    console.log('Application worker ' + process.pid + 'started...');
});

var serveIndex = require('serve-index');

mongoose.connect('mongodb://admin:7Z_EtDlXq1bs@127.6.138.2:27017/andreyilin');
app.set('view engine', 'jade');

app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    cookieName: 'session',
    secret: 'keyboard cat',
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
    httpOnly: true,
    secure: true,
    ephemeral: true
}));

app.use(csurf());

app.use(function(req, res, next) {
    if (req.session && req.session.user) {
        User.findOne({email: req.session.user}, function (err, user) {
            if (user) {
                req.user = user;
                req.session.user = user.email;
                res.locals.user = user;
            }
            next();
        });
    } else {
        next()
    }
});

function requireLogin(req, res, next) {
    if (!req.user) {
        res.redirect('/login');
    } else {
        next();
    }
}

app.get('/', function(req, res) {
    res.render('index.jade')
});

app.get('/chat', requireLogin, function(req, res){
    res.render('chat.jade');
});

app.get('/home', function(req, res) {
    res.render('home.jade');
});

io.sockets.on('connection', function(socket){
    connection.push(socket);
    console.log('Connected: %s sockets connected', connection.length);

    socket.on('disconnect', function(data) {

        users.splice (users.indexOf(socket.nick), 1);
        updateNicks();
        connection.splice(connection.indexOf(socket), 1);
        console.log('Disconnect: %s socket connected', connection.length)
    });

    socket.on('send message', function(data) {
        io.sockets.emit('new message', {msg: data, user: socket.nick});
        messages.push({msg: data, user: socket.nick});
    });

    socket.on('new user', function(data, callback) {
        callback(true);
        socket.nick = data;
        users.push(socket.nick);
        updateNicks();
        updateMessages();
    });

    function updateNicks() {
        io.sockets.emit('get users', users);
    }

    function updateMessages() {
        io.sockets.emit('get messages', messages);
    }
});


app.use('/directory', requireLogin, serveIndex(path.join(__dirname), {'icons': true, 'view': 'details'}));
app.use('/directory', express.static(path.join(__dirname)));


app.get('/register', function(req, res) {
    res.render('register.jade', { csrfToken: req.csrfToken() });
});

app.post('/register', function(req, res) {
    var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
    var user = new User({
        firstName: req.body.firstName,
        secondName: req.body.secondName,
        email: req.body.email,
        password: hash
    });
    user.save(function(err) {
        if (err) {
            var error = 'Something bad happend! Please try again';

            if (err.code === 11000) {
                error = 'That email is already taken, please try another'
            }
            res.render('register.jade', {error: error});
        } else {
            res.redirect('/dashboard')
        }
    });
});

app.get('/login', function(req, res) {
    res.render('login.jade', {csrfToken: req.csrfToken() });
});


app.post('/login', function(req, res) {
    User.findOne({email: req.body.email}, function(err, user) {
        if (!user) {
            res.render('login.jade', { error: 'Invalid email or password.'});
        } else {
            if (bcrypt.compareSync(req.body.password, user.password)) {
                req.session.user = user.email;
                res.redirect('/dashboard')
            } else {
                res.render('login.jade', {error: 'Invalid email or password.'});
            }
        }
    });
});

app.get('/dashboard', requireLogin, function(req, res) {
    res.render('dashboard.jade');
});

app.get('/logout', function(req, res) {
    req.session.reset();
    res.redirect('/');
});



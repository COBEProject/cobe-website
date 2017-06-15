var io;
var socket;

/**
 * Initialisation de SocketIO
 *
 * @param sIo
 * @param sSocket
 */
exports.init = function(sIo, sSocket)
{
    io      = sIo;
    socket  = sSocket;

    socket.emit('connected');

    /* Message envoyé par l'HOST. */
    socket.on('hostCreateNewGame', hostCreateNewGame);
    socket.on('hostStartGame', hostPrepareGame);
    socket.on('hostCountdownFinished', hostStartGame);
    socket.on('hostNextQuestion', hostNextQuestion);
    socket.on('hostReplay', hostReplay);

    /* Message envoyé par le PLAYER */
    socket.on('playerJoinGame', playerJoinGame);
    socket.on('playerAnswer', playerAnswer);

    /* Message envoyé pour l'API */
    socket.on('saveGameAPI', saveGameAPI);
};

/* ################################ */
/* ###         HOST CODE        ### */
/* ################################ */

/**
 * Création de la partie.
 * Génération d'un CODE partie.
 */
function hostCreateNewGame()
{
    var gameId = (Math.random() * 100000) | 0;

    var data = {
        gameId: gameId,
        mySocketId: this.id
    };

    this.emit('newGameCreated', data);
    this.join(gameId.toString());
}

/**
 * Préparation de la partie.
 *
 * @param gameId
 */
function hostPrepareGame(gameId)
{
    var data = {
        gameId : gameId,
        mySocketId : this.id
    };

    // Mise en attente de l'HOST.
    io.sockets.in(data.gameId).emit('waitingAPI', data);

    // Récupération des questions.
    var request = require('request');
    request('https://cobe-api.cfapps.io/questions', function (error, response, body) {
        if (!error && response.statusCode === 200) {
            // Mélange des questions.
            questions = shuffle(JSON.parse(body));
            io.sockets.in(data.gameId).emit('beginNewGame', data);
        }
    });
}

/**
 * Démarrage de la partie.
 *
 * @param gameId
 */
function hostStartGame(gameId)
{
    sendQuestion(0, gameId);
}

/**
 * Chargement de la prochaine question.
 *
 * @param data
 */
function hostNextQuestion(data)
{
    // Une partie = 5 questions.
    if (data.numQuestion < 5) {
        sendQuestion(data.numQuestion, data.gameId);
    } else {
        io.sockets.in(data.gameId).emit('endGame',data);
    }
}

/**
 * Redémarrage de la partie.
 *
 * @param gameId
 */
function hostReplay(gameId)
{
    hostPrepareGame(gameId);
}

/* ################################ */
/* ###        PLAYER CODE       ### */
/* ################################ */

/**
 * Rejoindre une partie.
 *
 * @param data
 */
function playerJoinGame(data)
{
    var room = socket.adapter.rooms[data.gameId];

    if( room !== undefined ){
        // attach the socket id to the data object.
        data.mySocketId = this.id;

        this.join(data.gameId);

        io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

    } else {
        this.emit('appError',{message: "Cette partie n'existe pas."} );
    }
}

function playerAnswer(data) {
    io.sockets.in(data.gameId).emit('hostCheckAnswer', data);
}

/* ################################ */
/* ###        GAME LOGIC        ### */
/* ################################ */

function sendQuestion(numQuestion, gameId) {
    var data = getQuestionData(numQuestion);
    io.sockets.in(gameId).emit('newQuestionData', data);
}

function getQuestionData(numQuestion) {

    var question = {
        numQuestion : numQuestion,
        question : questions[numQuestion].question,
        answers : questions[numQuestion].responses,
        correctAnswer : questions[numQuestion].correctResponse
    };

    return question;
}

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

var questions = [];

/* ################################ */
/* ###          API CODE        ### */
/* ################################ */


function saveGameAPI (data)
{
    console.log(data.nbPlayer);

    var options = {
        url: 'https://cobe-api.cfapps.io/game',
        method: 'POST',
        form: { 'nb_player': data.nbPlayer, 'name': data.name }
    };

    var request = require('request');
    request(options , function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
        }
    })
}
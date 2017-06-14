var io;
var socket;

/**
 * Initialisation de l'instance de jeu.
 * Appelé par app.js
 *
 * @param sIo
 * @param sSocket
 */
exports.init = function(sIo, sSocket) {
    io      = sIo;
    socket  = sSocket;

    socket.emit('connected', {'message': 'You are connected.'});

    socket.on('hostCreateNewGame', hostCreateNewGame);
    socket.on('hostStartGame', hostPrepareGame);
    socket.on('hostCountdownFinished', hostStartGame);
    socket.on('hostNextQuestion', hostNextQuestion);


    socket.on('playerJoinGame', playerJoinGame);
    socket.on('playerAnswer', playerAnswer);
};

/* ################################ */
/* ###         HOST CODE        ### */
/* ################################ */

function hostCreateNewGame() {
    // Create a unique Socket.IO Room
    var thisGameId = ( Math.random() * 100000 ) | 0;

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});

    // Join the Room and wait for the players
    this.join(thisGameId.toString());
}

function hostPrepareGame(gameId) {
    var data = {
        mySocketId : this.id,
        gameId : gameId
    };

    io.sockets.in(data.gameId).emit('beginNewGame', data);
}

function hostStartGame(gameId) {
    sendQuestions(0, gameId);
};

function hostNextQuestion(data) {
    if (data.numQuestion < 5){
        sendQuestions(data.numQuestion, data.gameId);
    } else {
        io.sockets.in(data.gameId).emit('endGame',data);
    }
}

/* ################################ */
/* ###        PLAYER CODE       ### */
/* ################################ */

function playerJoinGame(data) {
    // Look up the room ID in the Socket.IO manager object.
    var room = socket.adapter.rooms[data.gameId];

    // If the room exists...
    if( room != undefined ){
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

function sendQuestions(numQuestion, gameId) {
    var data = getQuestionData(numQuestion);
    io.sockets.in(gameId).emit('newQuestionData', data);
}

function getQuestionData(numQuestion){

    console.log(questions);

    var question = {
        numQuestion : numQuestion,
        question : questions[numQuestion].question,
        answers : questions[numQuestion].reponses,
        correctAnswer : questions[numQuestion].reponse
    };

    return question;
}

var questions = [
    {
        "question" : "De quel couleur est le cheval blanc d'Henri IV ?",
        "reponses" : {
            "A" : "Beige",
            "B" : "Brun",
            "C" : "Blanc",
            "D" : "Noir"
        },
        "reponse" : "C"
    },
    {
        "question" : "En quelle année sommes-nous ?",
        "reponses" : {
            "A" : "2016",
            "B" : "2017"
        },
        "reponse" : "B"
    }
];
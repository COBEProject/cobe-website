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

    socket.on('playerJoinGame', playerJoinGame);
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

/* ################################ */
/* ###        PLAYER CODE       ### */
/* ################################ */

function playerJoinGame(data) {

    console.log('Player ' + data.playerName + 'attempting to join game: ' + data.gameId );

    // Look up the room ID in the Socket.IO manager object.
    var room = socket.adapter.rooms[data.gameId];

    console.log(socket.adapter.rooms[data.gameId]);

    // If the room exists...
    if( room != undefined ){
        // attach the socket id to the data object.
        data.mySocketId = this.id;

        this.join(data.gameId);

        console.log('Player ' + data.playerName + ' joining game: ' + data.gameId );

        io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

    } else {
        this.emit('appError',{message: "Cette partie n'existe pas."} );
    }
}
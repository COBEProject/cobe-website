;
jQuery(function($){
    'use strict';

    var IO = {

        /**
         * Fonction d'initialisation appelé sur la page /play
         */
        init: function() {
            IO.socket = io.connect();
            IO.bindEvents();
        },

        bindEvents : function() {
            IO.socket.on('connected', IO.onConnected );

            IO.socket.on('newGameCreated', IO.onNewGameCreated );
            IO.socket.on('playerJoinedRoom', IO.playerJoinedRoom );

            IO.socket.on('appError', IO.error );

        },

        onConnected : function(data) {
            console.log(data.message);
            App.mySocketId = IO.socket.io.engine.id;
        },

        onNewGameCreated : function(data) {
            App.Host.gameInit(data);
        },

        playerJoinedRoom : function(data) {
            App[App.myRole].updateWaitingScreen(data);
        },

        error : function(data) {
            alert(data.message);
        }

    };

    var App = {
        gameId: 0,

        myRole: '',

        mySocketId: '',

        init: function () {
            App.cacheElements();
            App.showInitScreen();
            App.bindEvents();
        },

        cacheElements: function () {
            App.$doc = $(document);

            // Templates
            App.$gameArea               = $('#game-area');
            App.$templateIntroScreen    = $('#intro-screen-template').html();
            App.$templateNewGame        = $('#new-game-template').html();
            App.$templateJoinGame       = $('#join-game-template').html();

        },

        bindEvents: function () {
            App.$doc.on('click', '#btnCreateGame', App.Host.onCreateClick);
            App.$doc.on('click', '#btnStartGame', App.Host.onHostStartClick);

            App.$doc.on('click', '#btnJoinGame', App.Player.onJoinClick);
            App.$doc.on('click', '#btnStartJoinGame', App.Player.onPlayerStartClick);
        },

        showInitScreen: function() {
            App.$gameArea.html(App.$templateIntroScreen);
        },


        /* ############################## */
        /* ###        HOST CODE       ### */
        /* ############################## */

        Host : {

            players : [],

            numPlayersInRoom: 0,

            isNewGame : false,

            onCreateClick: function () {
                console.log('Clicked "Créer une partie"');
                IO.socket.emit('hostCreateNewGame');
            },

            onHostStartClick: function () {
                console.log('Clicked "Commencer la partie"');

            },

            /* Initialisation de la partie */
            gameInit: function (data) {
                App.gameId                  = data.gameId;
                App.mySocketId              = data.mySocketId;
                App.myRole                  = 'Host';
                App.Host.numPlayersInRoom   = 0;

                App.Host.displayNewGameScreen();

                console.log("Game started with ID: " + App.gameId + ' by host: ' + App.mySocketId);
            },

            displayNewGameScreen : function() {

                App.$gameArea.html(App.$templateNewGame);

                $('#gameURL').text(window.location.href);
                $('#spanNewGameCode').text(App.gameId);
            },

            updateWaitingScreen: function(data) {
                // If this is a restarted game, show the screen.
                if (App.Host.isNewGame) {
                    App.Host.displayNewGameScreen();
                }

                // Store the new player's data on the Host.
                App.Host.players.push(data);

                // Increment the number of players in the room
                App.Host.numPlayersInRoom += 1;

                console.log(App.Host.players);

                $('#playersWaiting').empty();
                for (var player in App.Host.players) {
                    var playerName = App.Host.players[player].playerName;
                    $('#playersWaiting').append('<p>' + playerName + '</p>');
                }

                // If two players have joined, start the game!
                if (App.Host.numPlayersInRoom >= 2) {
                    console.log('Room is ready to start');

                    $('#playersStart').empty();
                    $('#playersStart').append('<button id="btnStartGame">Commencer la partie</button>');

                    // IO.socket.emit('hostRoomFull', App.gameId);
                }
            },
        },

        /* ################################ */
        /* ###        PLAYER CODE       ### */
        /* ################################ */

        Player : {

            hostSocketId: '',

            myName: '',

            onJoinClick: function () {
                console.log('Clicked "Join A Game"');
                App.$gameArea.html(App.$templateJoinGame);
            },

            onPlayerStartClick: function() {
                console.log('Player clicked "Start"');

                var data = {
                    gameId : +($('#inputGameId').val()),
                    playerName : $('#inputPlayerName').val() || 'anon'
                };


                IO.socket.emit('playerJoinGame', data);

                App.myRole = 'Player';
                App.Player.myName = data.playerName;
            },

            updateWaitingScreen : function(data) {
                if (IO.socket.io.engine.id === data.mySocketId){
                    App.myRole = 'Player';
                    App.gameId = data.gameId;

                    $('#playerWaitingMessage')
                        .append('<p/>')
                        .text('Joined Game ' + data.gameId + '. Please wait for game to begin.');
                }
            },
        }
    };

    IO.init();
    App.init();

}($));
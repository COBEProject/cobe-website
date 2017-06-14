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
            IO.socket.on('beginNewGame', IO.beginNewGame );
            IO.socket.on('newQuestionData', IO.onNewQuestionData);
            IO.socket.on('hostCheckAnswer', IO.hostCheckAnswer);
            IO.socket.on('endGame', IO.endGame);

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

        beginNewGame : function(data) {
            App[App.myRole].gameCountdown(data);
        },

        onNewQuestionData : function(data) {
            App[App.myRole].newQuestion(data);
        },

        hostCheckAnswer : function(data) {
            if(App.myRole === 'Host') {
                App.Host.checkAnswer(data);
            }

            if(App.myRole === 'Player') {
                App.Player.hideAnswer(data);
            }
        },

        endGame : function(data) {
            App[App.myRole].endGame(data);
        },

        error : function(data) {
            alert(data.message);
        }

    };

    var App = {

        gameId: 0,

        myRole: '',

        mySocketId: '',

        currentQuestion: 0,

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
            App.$templateHostGame       = $('#host-game-template').html();

        },

        bindEvents: function () {
            // HOST
            App.$doc.on('click', '#btnCreateGame', App.Host.onCreateClick);
            App.$doc.on('click', '#btnStartGame', App.Host.onHostStartClick);

            // PLAYER
            App.$doc.on('click', '#btnJoinGame', App.Player.onJoinClick);
            App.$doc.on('click', '#btnStartJoinGame', App.Player.onPlayerStartClick);
            App.$doc.on('click', '.btnAnswer',App.Player.onPlayerAnswerClick);
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

            currentCorrectAnswer: '',

            currentQuestionNbPlayersAnswered: 0,

            onCreateClick: function () {
                console.log('Clicked "Créer une partie"');
                IO.socket.emit('hostCreateNewGame');
            },

            onHostStartClick: function () {
                console.log('Clicked "Commencer la partie"');
                IO.socket.emit('hostStartGame', App.gameId);
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

                $('#playersWaiting').empty();
                for (var player in App.Host.players) {
                    var playerName = App.Host.players[player].playerName;
                    $('#playersWaiting').append('<p>' + playerName + '</p>');
                }

                if (App.Host.numPlayersInRoom >= 2) {
                    $('#playersStart').empty();
                    $('#playersStart').append('<button id="btnStartGame">Commencer la partie</button>');
                }
            },

            gameCountdown : function() {

                App.$gameArea.html(App.$templateHostGame);

                // Begin the on-screen countdown timer
                var $secondsLeft = $('#countDown');
                App.countDown($secondsLeft, 5, function(){
                    $secondsLeft.hide();
                    IO.socket.emit('hostCountdownFinished', App.gameId);
                });


                for (var player in App.Host.players) {
                    var currentPlayer = App.Host.players[player];
                    $('#playerScores').append('' +
                        '<div class="playerScore">' +
                        '<span class="playerName">'+ currentPlayer.playerName +'</span>' +
                        '<span id="'+ currentPlayer.mySocketId + '" class="score">0</span>' +
                        '</div>')
                }

            },

            newQuestion : function(data) {
                $('#hostQuestion').text(data.question);

                App.currentQuestion             = data.numQuestion;
                App.Host.currentCorrectAnswer   = data.correctAnswer;

                console.log(App.currentQuestion);
            },

            checkAnswer : function(data) {

                if (data.currentQuestion === App.currentQuestion) {

                    App.Host.currentQuestionNbPlayersAnswered += 1;

                    // Get the player's score
                    var $pScore = $('#' + data.playerId);

                    if( App.Host.currentCorrectAnswer === data.answer ) {
                        $pScore.text( +$pScore.text() + 5 );
                    }

                    if (App.Host.currentQuestionNbPlayersAnswered === App.Host.numPlayersInRoom) {

                        App.currentQuestion += 1;

                        var data = {
                            gameId : App.gameId,
                            numQuestion : App.currentQuestion
                        };

                        IO.socket.emit('hostNextQuestion', data);
                    }
                }
            },

            endGame : function(data) {
                // Get the data for player 1 from the host screen

                // Get the data for player 2 from the host screen

                // Find the winner based on the scores

                // Display the winner (or tie game message)

                $('hostQuestion').text('Partie terminée');

                // Reset game data
                App.Host.currentQuestionNbPlayersAnswered = 0;
                App.Host.numPlayersInRoom = 0;
                App.Host.isNewGame = true;

                // IO.socket.emit('hostNextRound',data);
            },
        },

        /* ################################ */
        /* ###        PLAYER CODE       ### */
        /* ################################ */

        Player : {

            hostSocketId: '',

            myName: '',

            onJoinClick : function () {
                App.$gameArea.html(App.$templateJoinGame);
            },

            onPlayerStartClick : function() {
                var data = {
                    gameId : +($('#inputGameId').val()),
                    playerName : $('#inputPlayerName').val() || 'anon'
                };


                IO.socket.emit('playerJoinGame', data);

                App.myRole = 'Player';
                App.Player.myName = data.playerName;
            },

            onPlayerAnswerClick : function() {
                var answer = $(this).val();

                var data = {
                    gameId: App.gameId,
                    playerId: App.mySocketId,
                    answer: answer,
                    currentQuestion: App.currentQuestion
                };

                console.log(data);

                IO.socket.emit('playerAnswer',data);
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

            gameCountdown : function(hostData) {
                App.Player.hostSocketId = hostData.mySocketId;
                $('#game-area')
                    .html('<div class="gameOver">Soyez prêt !</div>');
            },

            newQuestion : function(data) {

                App.currentQuestion = data.numQuestion;

                var $list = $('<ul/>').attr('id','ulAnswers');

                $.each(data.answers, function(key, value){
                    $list                                //  <ul> </ul>
                        .append( $('<li/>')              //  <ul> <li> </li> </ul>
                            .append( $('<button/>')      //  <ul> <li> <button> </button> </li> </ul>
                                .addClass('btnAnswer')   //  <ul> <li> <button class='btnAnswer'> </button> </li> </ul>
                                .addClass('btn')         //  <ul> <li> <button class='btnAnswer'> </button> </li> </ul>
                                .val(key)               //  <ul> <li> <button class='btnAnswer' value='word'> </button> </li> </ul>
                                .html(value)              //  <ul> <li> <button class='btnAnswer' value='word'>word</button> </li> </ul>
                            )
                        )
                });

                // Insert the list onto the screen.
                $('#game-area').html($list);
            },

            hideAnswer : function(data) {
                if (IO.socket.io.engine.id === data.playerId) {
                    $('#ulAnswers').remove();
                }
            },

            endGame : function() {
                $('#game-area')
                    .html('<div class="gameOver">Partie terminée</div>')
                    .append(
                        // Create a button to start a new game.
                        $('<button>Start Again</button>')
                            .attr('id','btnPlayerRestart')
                            .addClass('btn')
                            .addClass('btnGameOver')
                    );
            }
        },

        /* ################################ */
        /* ###        UTILITY CODE      ### */
        /* ################################ */

        countDown : function($el, startTime, callback) {

            // Display the starting time on the screen.
            $el.text(startTime);

            var timer = setInterval(countItDown, 1000);

            function countItDown() {
                startTime -= 1
                $el.text(startTime);

                if( startTime <= 0 ){
                    clearInterval(timer);
                    callback();
                    return;
                }
            }

        },
    };

    IO.init();
    App.init();

}($));
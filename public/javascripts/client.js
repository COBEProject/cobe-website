;
jQuery(function($){
    'use strict';

    var IO = {

        /**
         *
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

            IO.socket.on('waitingAPI', IO.onWaitingAPI);

            IO.socket.on('appError', IO.error );

        },

        onConnected : function() {
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

        endGame : function (data) {
            App[App.myRole].endGame(data);
        },

        onWaitingAPI : function (data) {
            if(App.myRole === 'Host') {
                App.Host.waitingAPI(data);
            }
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
            App.$doc.on('click', '#btnReplay', App.Host.onReplay);

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
                IO.socket.emit('hostCreateNewGame');
            },

            onHostStartClick: function () {
                IO.socket.emit('hostStartGame', App.gameId);
            },

            onReplay: function () {
                IO.socket.emit('hostReplay', App.gameId);
            },

            /* Initialisation de la partie */
            gameInit: function (data) {
                App.gameId                  = data.gameId;
                App.mySocketId              = data.mySocketId;
                App.myRole                  = 'Host';
                App.Host.numPlayersInRoom   = 0;

                App.Host.displayNewGameScreen();
            },

            displayNewGameScreen : function () {

                App.$gameArea.html(App.$templateNewGame);

                $('#gameURL').text(window.location.href);
                $('#spanNewGameCode').text(App.gameId);
            },

            updateWaitingScreen: function (data) {
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

            gameCountdown : function () {

                $('#overlay-spinner').hide();

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

            newQuestion : function (data) {
                $('#hostQuestion').text(data.question);

                App.currentQuestion             = data.numQuestion;
                App.Host.currentCorrectAnswer   = data.correctAnswer;
                App.Host.currentQuestionNbPlayersAnswered = 0;
            },

            checkAnswer : function (data) {

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

            endGame : function (data) {

                $('#hostQuestion').text('Partie terminée');
                $('#playArea').append('<button class="btn" id="btnReplay">Rejouer</button>');

                // Reset game data
                App.Host.currentCorrectAnswer = '' ;
                App.Host.currentQuestionNbPlayersAnswered = 0;
                App.Host.isNewGame = true;

                var data = {
                    name: App.gameId,
                    nbPlayer : App.Host.numPlayersInRoom
                };

                IO.socket.emit('saveGameAPI', data);
            },

            waitingAPI : function (data) {
                $('#overlay-spinner').show();
            }
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

                IO.socket.emit('playerAnswer',data);
            },

            updateWaitingScreen : function(data) {
                if (IO.socket.io.engine.id === data.mySocketId){
                    App.myRole = 'Player';
                    App.gameId = data.gameId;

                    $('#playerInformations').hide();

                    $('#playerWaitingMessage')
                        .append('<p/>')
                        .text('Partie : ' + data.gameId + ' rejointe. Merci de patienter pendant que les autres joueurs rejoignent.');
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
                $('#game-area').append('<div class="help-question">' + data.question + '</div>');

            },

            hideAnswer : function(data) {
                if (IO.socket.io.engine.id === data.playerId) {
                    $('#ulAnswers').remove();
                }
            },

            endGame : function() {
                $('#game-area')
                    .html('<div class="gameOver">Partie terminée</div>')
                ;
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
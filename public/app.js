// Edutrivia Frontend Application
class EdutriviaApp {
    constructor() {
        this.currentUser = null;
        this.socket = null;
        this.gameState = {
            isPlaying: false,
            currentQuestion: null,
            timeLeft: 30,
            timer: null,
            opponent: null,
            pointsAtStake: 50,
            matchId: null,
            currentRound: 1,
            maxRounds: 5,
            playerScore: 0,
            opponentScore: 0,
            gamePhase: 'waiting', // waiting, clues, answers, results
            clueIndex: 0,
            cluesRevealed: false,
            answersRevealed: false,
            playerAnswer: null
        };
        this.searchStartTime = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
        this.initializeSocket();
    }

    setupEventListeners() {
        // Auth tabs
        document.getElementById('login-tab').addEventListener('click', () => this.switchAuthTab('login'));
        document.getElementById('register-tab').addEventListener('click', () => this.switchAuthTab('register'));

        // Auth forms
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));

        // Navigation
        document.getElementById('nav-dashboard').addEventListener('click', () => this.showPage('dashboard-page'));
        document.getElementById('nav-leaderboard').addEventListener('click', () => this.showLeaderboard());
        document.getElementById('nav-profile').addEventListener('click', () => this.showProfile());
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

        // Dashboard
        document.getElementById('quick-match-btn').addEventListener('click', () => this.startMatchmaking());
        document.getElementById('leaderboard-btn').addEventListener('click', () => this.showLeaderboard());
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());

        // Matchmaking
        document.getElementById('cancel-matchmaking').addEventListener('click', () => this.cancelMatchmaking());

        // Game
        document.getElementById('play-again-btn').addEventListener('click', () => this.startMatchmaking());
        document.getElementById('back-to-dashboard-btn').addEventListener('click', () => this.showPage('dashboard-page'));

        // Modal
        document.getElementById('close-leaderboard').addEventListener('click', () => this.closeModal('leaderboard-modal'));

        // Click outside modal to close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('matchmaking-status', (data) => {
            this.updateMatchmakingStatus(data);
        });

        this.socket.on('match-found', (data) => {
            this.handleMatchFound(data);
        });

        this.socket.on('matchmaking-cancelled', () => {
            this.showPage('dashboard-page');
        });

        this.socket.on('question-received', (question) => {
            this.handleQuestionReceived(question);
        });

        this.socket.on('opponent-answer', (data) => {
            this.handleOpponentAnswer(data);
        });

        this.socket.on('round-result', (result) => {
            this.handleRoundResult(result);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.showNotification('Connection lost. Reconnecting...', 'warning');
        });
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('edutrivia_token');
        if (!token) {
            this.showPage('login-page');
            return;
        }

        try {
            const response = await fetch('/api/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.showPage('dashboard-page');
                this.updateUserDisplay();
            } else {
                localStorage.removeItem('edutrivia_token');
                this.showPage('login-page');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showPage('login-page');
        }
    }

    switchAuthTab(tab) {
        const loginTab = document.getElementById('login-tab');
        const registerTab = document.getElementById('register-tab');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        if (tab === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        } else {
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            registerForm.style.display = 'block';
            loginForm.style.display = 'none';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        this.showLoading(true);

        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();

        if (!username || !password) {
            this.showNotification('Please fill in all fields', 'error');
            this.showLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('edutrivia_token', data.token);
                this.currentUser = data.user;
                this.showPage('dashboard-page');
                this.updateUserDisplay();
                this.showNotification('Welcome back!', 'success');
            } else {
                this.showNotification(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        this.showLoading(true);

        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value.trim();
        const confirmPassword = document.getElementById('register-confirm').value.trim();

        if (!username || !password || !confirmPassword) {
            this.showNotification('Please fill in all fields', 'error');
            this.showLoading(false);
            return;
        }

        if (password.length < 6) {
            this.showNotification('Password must be at least 6 characters', 'error');
            this.showLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            this.showLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('edutrivia_token', data.token);
                this.currentUser = data.user;
                this.showPage('dashboard-page');
                this.updateUserDisplay();
                this.showNotification('Account created successfully!', 'success');
            } else {
                this.showNotification(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification('Registration failed. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    handleLogout() {
        localStorage.removeItem('edutrivia_token');
        this.currentUser = null;
        this.socket.disconnect();
        this.showPage('login-page');
        this.clearForms();
    }

    updateUserDisplay() {
        if (this.currentUser) {
            document.getElementById('nav-username').textContent = this.currentUser.username;
            document.getElementById('welcome-username').textContent = this.currentUser.username;
            document.getElementById('nav-elo').textContent = this.currentUser.elo;
            document.getElementById('nav-points').textContent = this.currentUser.points;
            document.getElementById('user-elo').textContent = this.currentUser.elo;
            document.getElementById('user-points').textContent = this.currentUser.points;
            document.getElementById('user-games').textContent = this.currentUser.gamesPlayed;
            document.getElementById('user-wins').textContent = this.currentUser.gamesWon;
        }
    }

    startMatchmaking() {
        if (!this.currentUser) {
            this.showNotification('Please login first', 'error');
            return;
        }

        this.showPage('matchmaking-page');
        this.searchStartTime = Date.now();
        this.updateSearchTime();
        
        // Emit matchmaking request to server
        this.socket.emit('join-matchmaking', this.currentUser);
    }

    updateSearchTime() {
        if (this.searchStartTime) {
            const elapsed = Math.floor((Date.now() - this.searchStartTime) / 1000);
            document.getElementById('search-time').textContent = `${elapsed}s`;
            setTimeout(() => this.updateSearchTime(), 1000);
        }
    }

    updateMatchmakingStatus(data) {
        console.log('Matchmaking status:', data);
        // Update UI based on matchmaking status
    }

    handleMatchFound(data) {
        console.log('Match found:', data);
        this.gameState.matchId = data.matchId;
        this.gameState.opponent = data.opponent;
        
        // Start the game
        this.socket.emit('start-game', data.matchId);
    }

    handleQuestionReceived(question) {
        console.log('Question received:', question);
        this.gameState.currentQuestion = question;
        this.gameState.isPlaying = true;
        this.gameState.pointsAtStake = Math.min(50, Math.max(10, Math.floor(this.currentUser.points * 0.05)));
        this.gameState.gamePhase = 'clues';
        this.gameState.clueIndex = 0;
        this.gameState.cluesRevealed = false;
        this.gameState.answersRevealed = false;
        
        this.showPage('game-page');
        this.updateGameDisplay();
        this.startClueRevealSequence();
    }

    updateGameDisplay() {
        document.getElementById('player1-name').textContent = this.currentUser.username;
        document.getElementById('player1-score').textContent = this.gameState.playerScore;
        document.getElementById('player2-name').textContent = this.gameState.opponent.username;
        document.getElementById('player2-score').textContent = this.gameState.opponentScore;
        document.getElementById('current-round').textContent = `Round ${this.gameState.currentRound} of 5`;
        document.getElementById('points-at-stake').textContent = this.gameState.pointsAtStake;
    }

    startClueRevealSequence() {
        const question = this.gameState.currentQuestion;
        
        // Set up the question
        document.getElementById('question-category').textContent = question.category;
        
        // Hide all clues initially
        document.querySelectorAll('.clue').forEach(clue => {
            clue.style.display = 'none';
        });
        
        // Hide answer buttons initially
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.style.display = 'none';
        });
        
        // Start revealing clues one by one
        this.revealClue(0);
    }

    revealClue(index) {
        if (index >= 3) {
            // All clues revealed, wait 2 seconds then show answers
            this.gameState.cluesRevealed = true;
            setTimeout(() => {
                this.revealAnswers();
            }, 2000);
            return;
        }
        
        const clueElement = document.getElementById(`clue-${index + 1}`);
        clueElement.style.display = 'flex';
        clueElement.querySelector('.clue-text').textContent = this.gameState.currentQuestion.clues[index];
        
        // Reveal next clue after 2 seconds
        setTimeout(() => {
            this.revealClue(index + 1);
        }, 2000);
    }

    revealAnswers() {
        this.gameState.gamePhase = 'answers';
        this.gameState.answersRevealed = true;
        
        const question = this.gameState.currentQuestion;
        const answerButtons = document.querySelectorAll('.answer-btn');
        
        answerButtons.forEach((btn, index) => {
            const letter = String.fromCharCode(65 + index);
            btn.querySelector('.answer-text').textContent = question.answers[index];
            btn.dataset.answer = letter;
            btn.className = 'answer-btn';
            btn.style.display = 'flex';
        });
        
        // Start the answer timer
        this.startAnswerTimer();
        this.setupGameEventListeners();
        
        // Start simulated player timer (1-3 seconds after options appear)
        this.startSimulatedPlayerTimer();
    }

    startSimulatedPlayerTimer() {
        // Simulated player will answer between 1-3 seconds after options appear
        const answerTime = Math.random() * 2000 + 1000; // 1-3 seconds
        
        console.log('Simulated player will answer in:', answerTime, 'ms');
        
        setTimeout(() => {
            if (this.gameState.isPlaying && this.gameState.gamePhase === 'answers') {
                this.simulateOpponentAnswer();
            }
        }, answerTime);
    }

    simulateOpponentAnswer() {
        if (!this.gameState.isPlaying || this.gameState.gamePhase !== 'answers') return;
        
        console.log('Simulated player answering...');
        
        const question = this.gameState.currentQuestion;
        const isCorrect = Math.random() < 0.7; // 70% accuracy
        let simulatedAnswer;
        
        if (isCorrect) {
            simulatedAnswer = question.correct;
        } else {
            // Choose a wrong answer
            const wrongAnswers = ['A', 'B', 'C', 'D'].filter(a => a !== question.correct);
            simulatedAnswer = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
        }
        
        console.log('Simulated player chose:', simulatedAnswer, 'Correct:', isCorrect);
        
        // Show opponent's answer
        const opponentButton = document.querySelector(`[data-answer="${simulatedAnswer}"]`);
        if (opponentButton) {
            opponentButton.classList.add('opponent-selected');
        }
        
        // Store simulated player's answer
        this.gameState.opponentAnswer = {
            answer: simulatedAnswer,
            isCorrect: isCorrect
        };
        
        // Check if player has already answered
        if (this.gameState.playerAnswer) {
            // Both players have answered, show results immediately
            this.showRoundResults();
        }
    }

    showRoundResults() {
        console.log('Showing round results');
        
        const playerAnswer = this.gameState.playerAnswer;
        const opponentAnswer = this.gameState.opponentAnswer;
        const correctAnswer = this.gameState.currentQuestion.correct;
        
        // Determine correctness
        const playerCorrect = playerAnswer === correctAnswer;
        const opponentCorrect = opponentAnswer.answer === correctAnswer;
        
        // Determine round winner
        let roundWinner = 'tie';
        if (playerCorrect && !opponentCorrect) {
            roundWinner = 'player';
        } else if (!playerCorrect && opponentCorrect) {
            roundWinner = 'opponent';
        }
        
        // Update scores
        if (roundWinner === 'player') {
            this.gameState.playerScore++;
        } else if (roundWinner === 'opponent') {
            this.gameState.opponentScore++;
        }
        
        // Show all answers with correct/incorrect states
        document.querySelectorAll('.answer-btn').forEach(btn => {
            const answer = btn.dataset.answer;
            
            // Always show the correct answer in green
            if (answer === correctAnswer) {
                btn.classList.add('correct');
            }
            
            // Show player's answer
            if (answer === playerAnswer) {
                if (playerCorrect) {
                    btn.classList.add('player-correct');
                } else {
                    btn.classList.add('incorrect');
                }
            }
            
            // Show opponent's answer
            if (answer === opponentAnswer.answer) {
                if (opponentCorrect) {
                    btn.classList.add('opponent-correct');
                } else {
                    btn.classList.add('opponent-incorrect');
                }
            }
        });
        
        // Update display
        this.updateGameDisplay();
        
        // Show round result after 3 seconds
        setTimeout(() => {
            this.showRoundResult({
                playerAnswer: playerAnswer,
                playerCorrect: playerCorrect,
                opponentAnswer: opponentAnswer.answer,
                opponentCorrect: opponentCorrect,
                roundWinner: roundWinner,
                question: this.gameState.currentQuestion
            });
        }, 3000);
    }

    startAnswerTimer() {
        this.gameState.timeLeft = 30;
        this.updateTimerDisplay();
        
        this.gameState.timer = setInterval(() => {
            this.gameState.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.gameState.timeLeft <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    setupGameEventListeners() {
        // Remove existing listeners
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        // Add new listeners
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectAnswer(e.target));
        });
    }

    selectAnswer(button) {
        if (!this.gameState.isPlaying || this.gameState.gamePhase !== 'answers') return;

        console.log('Player selected answer:', button.dataset.answer);

        // Store the player's answer locally
        this.gameState.playerAnswer = button.dataset.answer;

        // Remove previous selection
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Mark selected answer
        button.classList.add('selected');
        
        // Disable all buttons
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.disabled = true;
        });

        this.gameState.isPlaying = false;
        clearInterval(this.gameState.timer);

        // Check if we have both answers now
        if (this.gameState.opponentAnswer) {
            // Both players have answered, show results immediately
            this.showRoundResults();
        } else {
            // Submit answer to server (for server-side processing)
            console.log('Sending answer to server:', {
                matchId: this.gameState.matchId,
                answer: button.dataset.answer,
                timeLeft: this.gameState.timeLeft
            });

            this.socket.emit('submit-answer', {
                matchId: this.gameState.matchId,
                answer: button.dataset.answer,
                timeLeft: this.gameState.timeLeft
            });
        }
    }

    handleOpponentAnswer(data) {
        console.log('Opponent answered:', data);
        
        // Show opponent's answer
        const opponentButton = document.querySelector(`[data-answer="${data.answer}"]`);
        if (opponentButton) {
            opponentButton.classList.add('opponent-selected');
        }
    }

    handleRoundResult(result) {
        console.log('Round result:', result);
        
        // Show all answers with correct/incorrect states
        document.querySelectorAll('.answer-btn').forEach(btn => {
            const answer = btn.dataset.answer;
            
            // Always show the correct answer in green
            if (answer === result.question.correct) {
                btn.classList.add('correct');
            }
            
            // Show player's answer (correct or incorrect)
            if (answer === result.playerAnswer) {
                if (result.playerCorrect) {
                    btn.classList.add('player-correct');
                } else {
                    btn.classList.add('incorrect');
                }
            }
            
            // Show opponent's answer (correct or incorrect)
            if (answer === result.opponentAnswer) {
                if (result.opponentCorrect) {
                    btn.classList.add('opponent-correct');
                } else {
                    btn.classList.add('opponent-incorrect');
                }
            }
        });

        // Update scores based on round winner
        if (result.roundWinner === 'player') {
            this.gameState.playerScore++;
        } else if (result.roundWinner === 'opponent') {
            this.gameState.opponentScore++;
        }

        // Update display
        this.updateGameDisplay();

        // Show round result after 3 seconds
        setTimeout(() => {
            this.showRoundResult(result);
        }, 3000);
    }

    startTimer() {
        this.gameState.timeLeft = 30;
        this.updateTimerDisplay();
        
        this.gameState.timer = setInterval(() => {
            this.gameState.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.gameState.timeLeft <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        document.getElementById('game-timer').textContent = this.gameState.timeLeft;
    }

    timeUp() {
        clearInterval(this.gameState.timer);
        this.gameState.isPlaying = false;
        
        // Auto-submit a random answer
        const buttons = document.querySelectorAll('.answer-btn');
        const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
        this.selectAnswer(randomButton);
    }

    showRoundResult(result) {
        this.gameState.currentRound++;
        
        // Check if match is over (best of 5)
        if (this.gameState.currentRound > this.gameState.maxRounds || 
            this.gameState.playerScore >= 3 || 
            this.gameState.opponentScore >= 3) {
            this.endMatch();
        } else {
            // Show round result screen
            this.showRoundResultScreen(result);
        }
    }

    showRoundResultScreen(result) {
        // Create a temporary result overlay
        const overlay = document.createElement('div');
        overlay.className = 'round-result-overlay';
        overlay.innerHTML = `
            <div class="round-result-content">
                <div class="result-header">
                    <h3>Round ${this.gameState.currentRound - 1} Complete!</h3>
                </div>
                <div class="result-details">
                    <div class="result-item">
                        <span class="result-label">Your Answer:</span>
                        <span class="result-value ${result.playerCorrect ? 'correct' : 'incorrect'}">
                            ${result.playerAnswer || this.gameState.playerAnswer || 'No answer'} ${result.playerCorrect ? '✓' : '✗'}
                        </span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">${this.gameState.opponent.username}:</span>
                        <span class="result-value ${result.opponentCorrect ? 'correct' : 'incorrect'}">
                            ${result.opponentAnswer || 'No answer'} ${result.opponentCorrect ? '✓' : '✗'}
                        </span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Round Winner:</span>
                        <span class="result-value ${result.roundWinner === 'player' ? 'winner' : result.roundWinner === 'opponent' ? 'loser' : 'tie'}">
                            ${result.roundWinner === 'player' ? 'You!' : result.roundWinner === 'opponent' ? this.gameState.opponent.username : 'Tie'}
                        </span>
                    </div>
                </div>
                <div class="match-score">
                    <h4>Match Score: ${this.gameState.playerScore} - ${this.gameState.opponentScore}</h4>
                </div>
                <div class="result-actions">
                    <button class="btn btn-primary" onclick="this.parentElement.parentElement.parentElement.remove(); window.edutriviaApp.continueToNextRound();">
                        Continue to Round ${this.gameState.currentRound}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    continueToNextRound() {
        console.log('Continuing to next round:', this.gameState.currentRound);
        
        // Reset game state for new round but keep match data
        this.gameState.isPlaying = false;
        this.gameState.currentQuestion = null;
        this.gameState.timeLeft = 30;
        this.gameState.timer = null;
        this.gameState.gamePhase = 'waiting';
        this.gameState.clueIndex = 0;
        this.gameState.cluesRevealed = false;
        this.gameState.answersRevealed = false;
        this.gameState.playerAnswer = null;
        
        // Show matchmaking screen briefly then start new round
        this.showPage('matchmaking-page');
        
        // Update matchmaking display to show we're continuing the match
        document.querySelector('.matchmaking-header h2').textContent = `Starting Round ${this.gameState.currentRound}...`;
        document.querySelector('.matchmaking-header p').textContent = `Match Score: ${this.gameState.playerScore} - ${this.gameState.opponentScore}`;
        
        // Update the match score display
        document.getElementById('current-elo').textContent = this.gameState.playerScore + ' - ' + this.gameState.opponentScore;
        
        // Start the next round after a short delay
        setTimeout(() => {
            this.startNextRound();
        }, 1500);
    }

    startNextRound() {
        console.log('Starting next round with match ID:', this.gameState.matchId);
        
        // Request new question from server
        this.socket.emit('start-game', this.gameState.matchId);
    }

    endMatch() {
        console.log('Match ended. Final score:', this.gameState.playerScore, '-', this.gameState.opponentScore);
        
        // Notify server that match is complete
        this.socket.emit('end-match', this.gameState.matchId);
        
        const isWinner = this.gameState.playerScore > this.gameState.opponentScore;
        const pointsWon = isWinner ? this.gameState.pointsAtStake * this.gameState.playerScore : 0;
        
        // Update user stats
        if (isWinner) {
            this.currentUser.points += pointsWon;
            this.currentUser.elo += 20;
            this.currentUser.gamesWon++;
        } else {
            this.currentUser.points -= Math.floor(this.gameState.pointsAtStake * 0.5);
            this.currentUser.elo -= 10;
        }
        this.currentUser.gamesPlayed++;

        // Show final results
        this.showFinalResults(isWinner, pointsWon);
    }

    showFinalResults(isWinner, pointsWon) {
        this.showPage('results-page');
        
        document.getElementById('result-trophy').className = isWinner ? 'fas fa-trophy' : 'fas fa-times';
        document.getElementById('result-title').textContent = isWinner ? 'Match Won!' : 'Match Lost';
        document.getElementById('result-subtitle').textContent = isWinner 
            ? `You won ${this.gameState.playerScore}-${this.gameState.opponentScore}!` 
            : `You lost ${this.gameState.playerScore}-${this.gameState.opponentScore}`;
        
        document.getElementById('winner-name').textContent = isWinner ? this.currentUser.username : this.gameState.opponent.username;
        document.getElementById('points-won').textContent = pointsWon;
        document.getElementById('new-elo').textContent = this.currentUser.elo;
        
        this.updateUserDisplay();
    }

    handleGameResult(result) {
        console.log('Game result:', result);
        
        // Update user stats locally
        if (result.correct) {
            this.currentUser.points += result.pointsWon;
            this.currentUser.elo += 20;
            this.currentUser.gamesWon++;
        } else {
            this.currentUser.points -= result.pointsLost;
            this.currentUser.elo -= 10;
        }
        this.currentUser.gamesPlayed++;

        // Show results
        setTimeout(() => {
            this.showResults(result);
        }, 1000);
    }

    showResults(result) {
        this.showPage('results-page');
        
        const isWinner = result.correct;
        document.getElementById('result-trophy').className = isWinner ? 'fas fa-trophy' : 'fas fa-times';
        document.getElementById('result-title').textContent = isWinner ? 'Congratulations!' : 'Better luck next time!';
        document.getElementById('result-subtitle').textContent = isWinner 
            ? 'You got it right!' 
            : 'Don\'t worry, you\'ll get the next one!';
        
        document.getElementById('winner-name').textContent = this.currentUser.username;
        document.getElementById('points-won').textContent = result.correct ? result.pointsWon : 0;
        document.getElementById('new-elo').textContent = this.currentUser.elo;
        
        this.updateUserDisplay();
    }

    cancelMatchmaking() {
        this.socket.emit('cancel-matchmaking');
        this.searchStartTime = null;
        this.showPage('dashboard-page');
    }

    async showLeaderboard() {
        try {
            const response = await fetch('/api/leaderboard');
            const data = await response.json();
            
            const leaderboardList = document.getElementById('leaderboard-list');
            leaderboardList.innerHTML = '';

            data.leaderboard.forEach((user, index) => {
                const item = document.createElement('div');
                item.className = 'leaderboard-item';
                item.innerHTML = `
                    <span class="rank">${index + 1}</span>
                    <span class="username">${user.username}</span>
                    <span class="elo">${user.elo}</span>
                    <span class="points">${user.points}</span>
                `;
                leaderboardList.appendChild(item);
            });

            this.showModal('leaderboard-modal');
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            this.showNotification('Failed to load leaderboard', 'error');
        }
    }

    showProfile() {
        this.showNotification('Profile feature coming soon!', 'info');
    }

    showSettings() {
        this.showNotification('Settings feature coming soon!', 'info');
    }

    showPage(pageId) {
        console.log('Showing page:', pageId);
        
        // Hide navbar on login page
        const navbar = document.getElementById('navbar');
        if (pageId === 'login-page') {
            navbar.style.display = 'none';
        } else {
            navbar.style.display = 'block';
        }

        // Hide all pages first
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
            page.style.display = 'none';
        });
        
        // Show only the requested page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.style.display = 'block';
            targetPage.classList.add('active');
        }
        
        // Reset game state when showing dashboard
        if (pageId === 'dashboard-page') {
            this.resetGameState();
        }
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    clearForms() {
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('register-username').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm').value = '';
    }

    resetGameState() {
        this.gameState = {
            isPlaying: false,
            currentQuestion: null,
            timeLeft: 30,
            timer: null,
            opponent: null,
            pointsAtStake: 50,
            matchId: null,
            currentRound: 1,
            maxRounds: 5,
            playerScore: 0,
            opponentScore: 0,
            gamePhase: 'waiting',
            clueIndex: 0,
            cluesRevealed: false,
            answersRevealed: false,
            playerAnswer: null
        };
        this.searchStartTime = null;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Edutrivia app...');
    window.edutriviaApp = new EdutriviaApp();
});

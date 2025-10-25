// Edutrivia Game Application
class EdutriviaApp {
    constructor() {
        this.currentUser = null;
        this.gameState = {
            isPlaying: false,
            currentQuestion: null,
            timeLeft: 30,
            timer: null,
            opponent: null,
            pointsAtStake: 50
        };
        this.questions = this.initializeQuestions();
        this.init();
    }

    init() {
        // Wait for DOM to be ready before setting up event listeners
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
                this.checkExistingUser();
            });
        } else {
            this.setupEventListeners();
            this.checkExistingUser();
        }
    }

    setupEventListeners() {
        // Login/Register
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        } else {
            console.error('Login button not found');
        }
        
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.handleRegister());
        } else {
            console.error('Register button not found');
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Dashboard
        const quickMatchBtn = document.getElementById('quick-match-btn');
        const leaderboardBtn = document.getElementById('leaderboard-btn');
        const settingsBtn = document.getElementById('settings-btn');
        
        if (quickMatchBtn) {
            quickMatchBtn.addEventListener('click', () => this.startMatchmaking());
        }
        if (leaderboardBtn) {
            leaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        }
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }

        // Matchmaking
        const cancelMatchmakingBtn = document.getElementById('cancel-matchmaking');
        if (cancelMatchmakingBtn) {
            cancelMatchmakingBtn.addEventListener('click', () => this.cancelMatchmaking());
        }

        // Game - These will be set up when the game screen is shown
        // Results
        const playAgainBtn = document.getElementById('play-again-btn');
        const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
        
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => this.startMatchmaking());
        }
        if (backToDashboardBtn) {
            backToDashboardBtn.addEventListener('click', () => this.showDashboard());
        }

        // Enter key for login
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && document.getElementById('login-screen').classList.contains('active')) {
                this.handleLogin();
            }
        });
    }

    checkExistingUser() {
        const userData = localStorage.getItem('edutrivia_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.showDashboard();
        } else {
            // Create a demo user if none exist
            this.createDemoUser();
        }
    }

    createDemoUser() {
        const users = JSON.parse(localStorage.getItem('edutrivia_users') || '[]');
        if (users.length === 0) {
            const demoUser = {
                id: 1,
                username: 'demo',
                password: 'demo123',
                elo: 1200,
                points: 1000,
                gamesPlayed: 0,
                gamesWon: 0,
                createdAt: new Date().toISOString()
            };
            users.push(demoUser);
            localStorage.setItem('edutrivia_users', JSON.stringify(users));
            console.log('Demo user created: username="demo", password="demo123"');
        }
    }

    handleLogin() {
        console.log('Login attempt started');
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        console.log('Username:', username, 'Password length:', password.length);

        if (!username || !password) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        // Check if user exists
        const users = JSON.parse(localStorage.getItem('edutrivia_users') || '[]');
        console.log('Total users in storage:', users.length);
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            console.log('Login successful for user:', user.username);
            this.currentUser = user;
            localStorage.setItem('edutrivia_user', JSON.stringify(user));
            this.showDashboard();
            this.showNotification('Welcome back!', 'success');
        } else {
            console.log('Login failed - user not found or wrong password');
            this.showNotification('Invalid username or password', 'error');
        }
    }

    handleRegister() {
        console.log('Register attempt started');
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        console.log('Username:', username, 'Password length:', password.length);

        if (!username || !password) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        // Check if user already exists
        const users = JSON.parse(localStorage.getItem('edutrivia_users') || '[]');
        console.log('Total users in storage:', users.length);
        
        if (users.find(u => u.username === username)) {
            console.log('Registration failed - username already exists');
            this.showNotification('Username already exists', 'error');
            return;
        }

        // Create new user
        const newUser = {
            id: Date.now(),
            username: username,
            password: password,
            elo: 1200,
            points: 1000,
            gamesPlayed: 0,
            gamesWon: 0,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('edutrivia_users', JSON.stringify(users));
        console.log('New user created:', newUser.username);
        
        this.currentUser = newUser;
        localStorage.setItem('edutrivia_user', JSON.stringify(newUser));
        this.showDashboard();
        this.showNotification('Account created successfully!', 'success');
    }

    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('edutrivia_user');
        this.showScreen('login-screen');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }

    showDashboard() {
        this.showScreen('dashboard-screen');
        this.updateUserDisplay();
    }

    updateUserDisplay() {
        if (this.currentUser) {
            document.getElementById('user-display').textContent = this.currentUser.username;
            document.getElementById('welcome-user').textContent = this.currentUser.username;
            document.getElementById('user-elo').textContent = this.currentUser.elo;
            document.getElementById('user-points').textContent = this.currentUser.points;
        }
    }

    startMatchmaking() {
        this.showScreen('matchmaking-screen');
        this.simulateMatchmaking();
    }

    simulateMatchmaking() {
        // Simulate finding an opponent
        const users = JSON.parse(localStorage.getItem('edutrivia_users') || '[]');
        const availableUsers = users.filter(u => u.id !== this.currentUser.id);
        
        // Find user with similar ELO (±100 points)
        const eloRange = 100;
        const similarUsers = availableUsers.filter(u => 
            Math.abs(u.elo - this.currentUser.elo) <= eloRange
        );

        const opponent = similarUsers.length > 0 
            ? similarUsers[Math.floor(Math.random() * similarUsers.length)]
            : availableUsers[Math.floor(Math.random() * availableUsers.length)];

        // Simulate matchmaking delay
        setTimeout(() => {
            this.startGame(opponent);
        }, 3000 + Math.random() * 2000);
    }

    startGame(opponent) {
        this.gameState.opponent = opponent;
        this.gameState.isPlaying = true;
        this.gameState.pointsAtStake = Math.min(50, Math.max(10, Math.floor(this.currentUser.points * 0.05)));
        
        this.showScreen('game-screen');
        this.updateGameDisplay();
        this.loadQuestion();
        this.setupGameEventListeners();
        this.startTimer();
    }

    updateGameDisplay() {
        document.getElementById('player1-name').textContent = this.currentUser.username;
        document.getElementById('player1-elo').textContent = this.currentUser.elo;
        document.getElementById('player2-name').textContent = this.gameState.opponent.username;
        document.getElementById('player2-elo').textContent = this.gameState.opponent.elo;
        document.getElementById('points-at-stake').textContent = this.gameState.pointsAtStake;
    }

    setupGameEventListeners() {
        // Remove any existing listeners to prevent duplicates
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        
        // Add new listeners
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectAnswer(e.target));
        });
    }

    loadQuestion() {
        const question = this.questions[Math.floor(Math.random() * this.questions.length)];
        this.gameState.currentQuestion = question;
        
        document.getElementById('question-category').textContent = question.category;
        document.getElementById('clue-1').querySelector('.clue-text').textContent = question.clues[0];
        document.getElementById('clue-2').querySelector('.clue-text').textContent = question.clues[1];
        document.getElementById('clue-3').querySelector('.clue-text').textContent = question.clues[2];

        const answerButtons = document.querySelectorAll('.answer-btn');
        answerButtons.forEach((btn, index) => {
            btn.textContent = `${String.fromCharCode(65 + index)}) ${question.answers[index]}`;
            btn.dataset.answer = String.fromCharCode(65 + index);
            btn.className = 'answer-btn';
        });
    }

    selectAnswer(button) {
        if (!this.gameState.isPlaying) return;

        // Remove previous selection
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Mark selected answer
        button.classList.add('selected');
        
        // Check answer after a short delay
        setTimeout(() => {
            this.checkAnswer(button);
        }, 1000);
    }

    checkAnswer(selectedButton) {
        const selectedAnswer = selectedButton.dataset.answer;
        const correctAnswer = this.gameState.currentQuestion.correct;
        
        // Show correct/incorrect answers
        document.querySelectorAll('.answer-btn').forEach(btn => {
            if (btn.dataset.answer === correctAnswer) {
                btn.classList.add('correct');
            } else if (btn.dataset.answer === selectedAnswer && selectedAnswer !== correctAnswer) {
                btn.classList.add('incorrect');
            }
        });

        this.gameState.isPlaying = false;
        clearInterval(this.gameState.timer);

        // Determine winner and update scores
        const isCorrect = selectedAnswer === correctAnswer;
        this.endGame(isCorrect);
    }

    endGame(isCorrect) {
        const winner = isCorrect ? this.currentUser : this.gameState.opponent;
        const pointsWon = this.gameState.pointsAtStake;

        // Update user stats
        this.currentUser.gamesPlayed++;
        if (isCorrect) {
            this.currentUser.gamesWon++;
            this.currentUser.points += pointsWon;
            this.currentUser.elo += 20; // ELO gain for win
        } else {
            this.currentUser.points -= Math.floor(pointsWon * 0.5); // Lose half points
            this.currentUser.elo -= 10; // ELO loss
        }

        // Ensure points don't go below 0
        this.currentUser.points = Math.max(0, this.currentUser.points);

        // Save updated user data
        this.saveUserData();

        // Show results
        setTimeout(() => {
            this.showResults(winner, pointsWon);
        }, 2000);
    }

    showResults(winner, pointsWon) {
        this.showScreen('results-screen');
        
        document.getElementById('winner-name').textContent = winner.username;
        document.getElementById('points-won').textContent = pointsWon;
        document.getElementById('new-elo').textContent = this.currentUser.elo;
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
        
        // Auto-select a random answer if no answer was selected
        const buttons = document.querySelectorAll('.answer-btn');
        const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
        this.checkAnswer(randomButton);
    }

    cancelMatchmaking() {
        this.showDashboard();
    }

    saveUserData() {
        const users = JSON.parse(localStorage.getItem('edutrivia_users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = this.currentUser;
            localStorage.setItem('edutrivia_users', JSON.stringify(users));
            localStorage.setItem('edutrivia_user', JSON.stringify(this.currentUser));
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;

        if (type === 'success') {
            notification.style.background = '#27ae60';
        } else if (type === 'error') {
            notification.style.background = '#e74c3c';
        } else {
            notification.style.background = '#667eea';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showLeaderboard() {
        const users = JSON.parse(localStorage.getItem('edutrivia_users') || '[]');
        const sortedUsers = users.sort((a, b) => b.elo - a.elo);
        
        let leaderboardHTML = `
            <div class="leaderboard-modal">
                <div class="modal-content">
                    <h2>Leaderboard</h2>
                    <div class="leaderboard-list">
        `;

        sortedUsers.slice(0, 10).forEach((user, index) => {
            leaderboardHTML += `
                <div class="leaderboard-item">
                    <span class="rank">${index + 1}</span>
                    <span class="username">${user.username}</span>
                    <span class="elo">${user.elo}</span>
                    <span class="points">${user.points}</span>
                </div>
            `;
        });

        leaderboardHTML += `
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" class="btn btn-primary">Close</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', leaderboardHTML);
    }

    showSettings() {
        this.showNotification('Settings feature coming soon!', 'info');
    }

    initializeQuestions() {
        return [
            {
                category: "Science",
                clues: [
                    "This element has the atomic number 1",
                    "It's the most abundant element in the universe",
                    "It's the fuel that powers the sun"
                ],
                answers: ["Hydrogen", "Helium", "Oxygen", "Carbon"],
                correct: "A"
            },
            {
                category: "History",
                clues: [
                    "This war lasted from 1939 to 1945",
                    "It involved most of the world's nations",
                    "It ended with the dropping of atomic bombs"
                ],
                answers: ["World War I", "World War II", "Korean War", "Vietnam War"],
                correct: "B"
            },
            {
                category: "Geography",
                clues: [
                    "This is the largest continent by area",
                    "It contains both the highest and lowest points on Earth",
                    "It's home to Mount Everest"
                ],
                answers: ["Africa", "North America", "Asia", "Europe"],
                correct: "C"
            },
            {
                category: "Literature",
                clues: [
                    "This author wrote 'Romeo and Juliet'",
                    "He's considered the greatest writer in the English language",
                    "He lived in the 16th-17th century"
                ],
                answers: ["Charles Dickens", "William Shakespeare", "Mark Twain", "Jane Austen"],
                correct: "B"
            },
            {
                category: "Mathematics",
                clues: [
                    "This is the ratio of a circle's circumference to its diameter",
                    "It's approximately 3.14159",
                    "It's an irrational number"
                ],
                answers: ["Phi", "Pi", "Euler's number", "Golden ratio"],
                correct: "B"
            },
            {
                category: "Biology",
                clues: [
                    "This organelle is known as the powerhouse of the cell",
                    "It produces ATP energy",
                    "It has its own DNA"
                ],
                answers: ["Nucleus", "Mitochondria", "Ribosome", "Chloroplast"],
                correct: "B"
            },
            {
                category: "Physics",
                clues: [
                    "This is the speed of light in a vacuum",
                    "It's approximately 300,000 km/s",
                    "Einstein's theory of relativity is based on it"
                ],
                answers: ["299,792,458 m/s", "300,000 m/s", "150,000 m/s", "600,000 m/s"],
                correct: "A"
            },
            {
                category: "Chemistry",
                clues: [
                    "This is the chemical symbol for gold",
                    "It's a precious metal",
                    "It's element number 79"
                ],
                answers: ["Go", "Gd", "Au", "Ag"],
                correct: "C"
            }
        ];
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Edutrivia app');
    window.edutriviaApp = new EdutriviaApp();
});

// Add CSS for notifications and leaderboard
const additionalCSS = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    .leaderboard-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal-content {
        background: white;
        border-radius: 20px;
        padding: 30px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    }

    .leaderboard-list {
        margin: 20px 0;
    }

    .leaderboard-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border-bottom: 1px solid #e1e5e9;
        gap: 15px;
    }

    .leaderboard-item:last-child {
        border-bottom: none;
    }

    .rank {
        font-weight: 700;
        color: #667eea;
        min-width: 30px;
    }

    .username {
        flex: 1;
        font-weight: 500;
    }

    .elo, .points {
        font-weight: 600;
        color: #666;
        min-width: 80px;
        text-align: right;
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

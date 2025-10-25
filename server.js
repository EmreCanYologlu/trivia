const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Database setup
const db = new sqlite3.Database('./edutrivia.db');

// Initialize database tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        elo INTEGER DEFAULT 1200,
        points INTEGER DEFAULT 1000,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        player1_id TEXT,
        player2_id TEXT,
        status TEXT DEFAULT 'waiting',
        question_id TEXT,
        winner_id TEXT,
        points_at_stake INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        clues TEXT NOT NULL,
        answers TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        difficulty INTEGER DEFAULT 1
    )`);

    // Insert sample questions
    const questions = [
        {
            id: uuidv4(),
            category: "Science",
            clues: JSON.stringify([
                "This element has the atomic number 1",
                "It's the most abundant element in the universe",
                "It's the fuel that powers the sun"
            ]),
            answers: JSON.stringify(["Hydrogen", "Helium", "Oxygen", "Carbon"]),
            correct_answer: "A"
        },
        {
            id: uuidv4(),
            category: "History",
            clues: JSON.stringify([
                "This war lasted from 1939 to 1945",
                "It involved most of the world's nations",
                "It ended with the dropping of atomic bombs"
            ]),
            answers: JSON.stringify(["World War I", "World War II", "Korean War", "Vietnam War"]),
            correct_answer: "B"
        },
        {
            id: uuidv4(),
            category: "Geography",
            clues: JSON.stringify([
                "This is the largest continent by area",
                "It contains both the highest and lowest points on Earth",
                "It's home to Mount Everest"
            ]),
            answers: JSON.stringify(["Africa", "North America", "Asia", "Europe"]),
            correct_answer: "C"
        }
    ];

    questions.forEach(q => {
        db.run(`INSERT OR IGNORE INTO questions (id, category, clues, answers, correct_answer) 
                VALUES (?, ?, ?, ?, ?)`, 
                [q.id, q.category, q.clues, q.answers, q.correct_answer]);
    });
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'edutrivia_secret_key_2024';

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// API Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (row) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            // Create new user
            const userId = uuidv4();
            const hashedPassword = bcrypt.hashSync(password, 10);

            db.run('INSERT INTO users (id, username, password) VALUES (?, ?, ?)', 
                   [userId, username, hashedPassword], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to create user' });
                }

                const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '24h' });
                res.json({ 
                    token, 
                    user: { 
                        id: userId, 
                        username, 
                        elo: 1200, 
                        points: 1000,
                        gamesPlayed: 0,
                        gamesWon: 0
                    } 
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (!user || !bcrypt.compareSync(password, user.password)) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ 
                token, 
                user: { 
                    id: user.id, 
                    username: user.username, 
                    elo: user.elo, 
                    points: user.points,
                    gamesPlayed: user.games_played,
                    gamesWon: user.games_won
                } 
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/user', authenticateToken, (req, res) => {
    db.get('SELECT * FROM users WHERE id = ?', [req.user.userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ 
            user: { 
                id: user.id, 
                username: user.username, 
                elo: user.elo, 
                points: user.points,
                gamesPlayed: user.games_played,
                gamesWon: user.games_won
            } 
        });
    });
});

app.get('/api/leaderboard', (req, res) => {
    db.all('SELECT username, elo, points, games_played, games_won FROM users ORDER BY elo DESC LIMIT 10', 
           (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ leaderboard: rows });
    });
});

app.get('/api/question', (req, res) => {
    db.get('SELECT * FROM questions ORDER BY RANDOM() LIMIT 1', (err, question) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!question) {
            return res.status(404).json({ error: 'No questions available' });
        }

        res.json({
            id: question.id,
            category: question.category,
            clues: JSON.parse(question.clues),
            answers: JSON.parse(question.answers),
            correct: question.correct_answer
        });
    });
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Matchmaking and Game Logic
const matchmakingQueue = new Map();
const activeMatches = new Map();

// Simulated players for matchmaking
const simulatedPlayers = [
    { username: 'Alex_Trivia', elo: 1250, id: 'sim_1' },
    { username: 'QuizMaster', elo: 1180, id: 'sim_2' },
    { username: 'BrainBox', elo: 1320, id: 'sim_3' },
    { username: 'KnowledgeSeeker', elo: 1100, id: 'sim_4' },
    { username: 'TriviaChamp', elo: 1400, id: 'sim_5' },
    { username: 'SmartPlayer', elo: 1050, id: 'sim_6' }
];

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-matchmaking', (userData) => {
        console.log('User joined matchmaking:', userData.username);
        
        // Add user to matchmaking queue
        matchmakingQueue.set(socket.id, {
            socketId: socket.id,
            userId: userData.id,
            username: userData.username,
            elo: userData.elo,
            joinedAt: Date.now()
        });

        socket.emit('matchmaking-status', { status: 'searching', message: 'Finding opponent...' });

        // Simulate matchmaking delay and find opponent
        setTimeout(() => {
            const user = matchmakingQueue.get(socket.id);
            if (!user) return;

            // Find similar ELO opponent (simulated or real)
            const eloRange = 100;
            const availableOpponents = Array.from(matchmakingQueue.values())
                .filter(u => u.userId !== user.userId && Math.abs(u.elo - user.elo) <= eloRange);

            let opponent;
            if (availableOpponents.length > 0) {
                // Match with real player
                opponent = availableOpponents[Math.floor(Math.random() * availableOpponents.length)];
                matchmakingQueue.delete(opponent.socketId);
            } else {
                // Match with simulated player
                const similarSimulated = simulatedPlayers.filter(p => 
                    Math.abs(p.elo - user.elo) <= eloRange
                );
                opponent = similarSimulated.length > 0 
                    ? similarSimulated[Math.floor(Math.random() * similarSimulated.length)]
                    : simulatedPlayers[Math.floor(Math.random() * simulatedPlayers.length)];
            }

            matchmakingQueue.delete(socket.id);

            // Create match
            const matchId = uuidv4();
            const match = {
                id: matchId,
                player1: user,
                player2: opponent,
                status: 'active',
                question: null,
                startTime: Date.now()
            };

            activeMatches.set(matchId, match);

            // Notify both players
            socket.emit('match-found', {
                matchId,
                opponent: {
                    username: opponent.username,
                    elo: opponent.elo
                }
            });

            if (opponent.socketId && io.sockets.sockets.get(opponent.socketId)) {
                io.sockets.sockets.get(opponent.socketId).emit('match-found', {
                    matchId,
                    opponent: {
                        username: user.username,
                        elo: user.elo
                    }
                });
            }

        }, 2000 + Math.random() * 3000); // 2-5 second delay
    });

    socket.on('cancel-matchmaking', () => {
        matchmakingQueue.delete(socket.id);
        socket.emit('matchmaking-cancelled');
    });

    socket.on('start-game', (matchId) => {
        console.log('Starting game for match:', matchId);
        const match = activeMatches.get(matchId);
        if (!match) {
            console.log('No match found for ID:', matchId);
            return;
        }

        console.log('Match found, getting new question');
        // Get random question
        db.get('SELECT * FROM questions ORDER BY RANDOM() LIMIT 1', (err, question) => {
            if (err || !question) {
                console.log('Error getting question:', err);
                return;
            }

            console.log('Question received:', question.category);
            match.question = {
                id: question.id,
                category: question.category,
                clues: JSON.parse(question.clues),
                answers: JSON.parse(question.answers),
                correct: question.correct_answer
            };

            // Send question to player
            console.log('Sending question to player');
            socket.emit('question-received', match.question);
            
            // If opponent is simulated, handle simulated player logic
            if (match.player2.id && match.player2.id.startsWith('sim_')) {
                match.simulatedPlayer = {
                    id: match.player2.id,
                    username: match.player2.username,
                    elo: match.player2.elo,
                    answerTime: Math.random() * 2000 + 1000, // 1-3 seconds after options appear
                    accuracy: Math.random() * 0.3 + 0.6 // 60-90% accuracy
                };
                console.log('Simulated player configured with answer time:', match.simulatedPlayer.answerTime);
            }
        });
    });

    socket.on('submit-answer', (data) => {
        console.log('Received answer from player:', data);
        const { matchId, answer, timeLeft } = data;
        const match = activeMatches.get(matchId);
        
        if (!match) {
            console.log('No match found for ID:', matchId);
            return;
        }

        console.log('Match found:', match);
        const isCorrect = answer === match.question.correct;
        console.log('Answer correct:', isCorrect);
        
        // Store player's answer
        match.playerAnswer = {
            answer: answer,
            isCorrect: isCorrect,
            timeLeft: timeLeft
        };

        console.log('Stored player answer:', match.playerAnswer);

        // If simulated player hasn't answered yet, make them answer
        if (match.simulatedPlayer && !match.simulatedPlayer.answered) {
            console.log('Simulated player will answer in 1-6 seconds');
            setTimeout(() => {
                handleSimulatedPlayerAnswer(match, socket);
            }, Math.random() * 5000 + 1000); // 1-6 seconds after player
        } else if (!match.simulatedPlayer) {
            console.log('No simulated player, ending round immediately');
            // No simulated player, end round immediately
            endRound(match, socket);
        }
    });

    function handleSimulatedPlayerAnswer(match, socket) {
        console.log('Handling simulated player answer');
        if (!match.simulatedPlayer || match.simulatedPlayer.answered) {
            console.log('Simulated player already answered or doesn\'t exist');
            return;
        }

        const question = match.question;
        const isCorrect = Math.random() < match.simulatedPlayer.accuracy;
        let simulatedAnswer;

        if (isCorrect) {
            simulatedAnswer = question.correct;
        } else {
            // Choose a wrong answer
            const wrongAnswers = ['A', 'B', 'C', 'D'].filter(a => a !== question.correct);
            simulatedAnswer = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
        }

        console.log('Simulated player answer:', simulatedAnswer, 'Correct:', isCorrect);

        match.simulatedPlayer.answered = true;
        match.simulatedPlayer.answer = simulatedAnswer;
        match.simulatedPlayer.isCorrect = isCorrect;

        // Send simulated player's answer to client
        console.log('Sending opponent answer to client');
        socket.emit('opponent-answer', {
            answer: simulatedAnswer,
            isCorrect: isCorrect,
            opponent: match.player2
        });

        // End the round
        console.log('Ending round');
        endRound(match, socket);
    }

    function endRound(match, socket) {
        console.log('Ending round');
        const playerCorrect = match.playerAnswer ? match.playerAnswer.isCorrect : false;
        const simulatedCorrect = match.simulatedPlayer ? match.simulatedPlayer.isCorrect : false;

        console.log('Player correct:', playerCorrect, 'Simulated correct:', simulatedCorrect);

        // Determine round winner
        let roundWinner = 'tie';
        if (playerCorrect && !simulatedCorrect) {
            roundWinner = 'player';
        } else if (!playerCorrect && simulatedCorrect) {
            roundWinner = 'opponent';
        }

        console.log('Round winner:', roundWinner);

        const roundResult = {
            playerAnswer: match.playerAnswer ? match.playerAnswer.answer : null,
            playerCorrect: playerCorrect,
            opponentAnswer: match.simulatedPlayer ? match.simulatedPlayer.answer : null,
            opponentCorrect: simulatedCorrect,
            roundWinner: roundWinner,
            question: match.question,
            matchId: match.id // Include match ID for continuing
        };

        console.log('Sending round result:', roundResult);

        // Send round result
        socket.emit('round-result', roundResult);

        // Don't delete the match - keep it for next round
        // Reset round-specific data but keep match structure
        match.playerAnswer = null;
        match.question = null;
        if (match.simulatedPlayer) {
            match.simulatedPlayer.answered = false;
            match.simulatedPlayer.answer = null;
            match.simulatedPlayer.isCorrect = false;
        }
        
        console.log('Match prepared for next round');
    }

    socket.on('end-match', (matchId) => {
        console.log('Ending match:', matchId);
        const match = activeMatches.get(matchId);
        if (match) {
            activeMatches.delete(matchId);
            console.log('Match ended and cleaned up');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        matchmakingQueue.delete(socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Edutrivia server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to play!`);
});

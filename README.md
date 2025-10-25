# 🎓 Edutrivia - Educational Trivia Game

A modern, real-time educational trivia game where players compete against each other using their knowledge and strategic thinking. Features ELO-based matchmaking, live gameplay, and a comprehensive ranking system.

## ✨ Features

### 🎮 **Core Gameplay**
- **Real-time Matchmaking**: Find opponents with similar skill levels
- **3-Clue System**: Progressive hints for each question
- **Multiple Categories**: Science, History, Geography, Literature, Mathematics, Biology, Physics, Chemistry
- **ELO Rating System**: Competitive ranking based on performance
- **Edutrivia Points**: In-game currency for matches

### 🏆 **Competitive Features**
- **Live Leaderboard**: See how you rank against other players
- **Match History**: Track your games and performance
- **Skill-based Matching**: Fair matchmaking using ELO ratings
- **Real-time Results**: Instant feedback and score updates

### 🎨 **Modern UI/UX**
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Beautiful Animations**: Smooth transitions and visual feedback
- **Dark/Light Theme**: Easy on the eyes
- **Intuitive Navigation**: Clean, user-friendly interface

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone or download the project**
   ```bash
   cd trivia
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```

### Development Mode
```bash
npm run dev
```

## 🎯 How to Play

### 1. **Create Account**
- Register with a username and password
- Or use the demo account: `demo` / `demo123`

### 2. **Find a Match**
- Click "Quick Match" on the dashboard
- Wait for the system to find an opponent
- Get matched with players of similar skill level

### 3. **Play the Game**
- Read the 3 clues for each question
- Choose the correct answer from 4 options
- Answer within 30 seconds
- Win points and improve your ELO rating

### 4. **Climb the Leaderboard**
- Win matches to gain ELO points
- Earn Edutrivia points for victories
- Compete for the top spots

## 🏗️ Architecture

### Backend (Node.js + Express)
- **RESTful API**: User authentication, leaderboards, questions
- **WebSocket Support**: Real-time matchmaking and gameplay
- **SQLite Database**: User data, matches, questions
- **JWT Authentication**: Secure user sessions
- **Rate Limiting**: Protection against abuse

### Frontend (Vanilla JavaScript)
- **Modern ES6+**: Clean, maintainable code
- **Socket.IO Client**: Real-time communication
- **Responsive CSS**: Mobile-first design
- **Component-based**: Modular architecture

### Key Technologies
- **Backend**: Express.js, Socket.IO, SQLite3, JWT, bcrypt
- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Real-time**: WebSocket connections for live gameplay
- **Security**: Helmet, CORS, rate limiting

## 🎮 Game Mechanics

### ELO Rating System
- **Starting ELO**: 1200 points
- **Win**: +20 ELO points
- **Loss**: -10 ELO points
- **Matchmaking**: ±100 ELO range for fair matches

### Points System
- **Starting Points**: 1000 Edutrivia points
- **Match Stake**: 5% of total points (min 10, max 50)
- **Win**: Gain full stake
- **Loss**: Lose half the stake

### Question Format
1. **Category**: Subject area (Science, History, etc.)
2. **Clue 1**: First hint (most general)
3. **Clue 2**: Second hint (more specific)
4. **Clue 3**: Third hint (most specific)
5. **4 Answer Choices**: A, B, C, D format

## 🔧 Configuration

### Environment Variables
```bash
PORT=3000                    # Server port
JWT_SECRET=your_secret_key   # JWT signing secret
```

### Database
- SQLite database (`edutrivia.db`) created automatically
- Tables: users, matches, questions
- Sample data included

## 📱 Mobile Support

The application is fully responsive and works great on:
- 📱 Mobile phones (iOS/Android)
- 📱 Tablets (iPad/Android)
- 💻 Desktop computers
- 🖥️ Large screens

## 🎨 Customization

### Adding New Questions
Questions are stored in the database with the following structure:
```json
{
  "category": "Science",
  "clues": ["Clue 1", "Clue 2", "Clue 3"],
  "answers": ["Answer A", "Answer B", "Answer C", "Answer D"],
  "correct": "A"
}
```

### Styling
- CSS custom properties for easy theming
- Modular component styles
- Responsive breakpoints
- Animation keyframes

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker (Optional)
```dockerfile
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for learning and development!

## 🎓 Educational Value

This project demonstrates:
- **Real-time Web Applications**: WebSocket implementation
- **User Authentication**: JWT and bcrypt security
- **Database Design**: SQLite with proper relationships
- **Frontend Architecture**: Component-based JavaScript
- **API Design**: RESTful endpoints
- **Game Development**: Matchmaking and scoring systems
- **UI/UX Design**: Modern, responsive interfaces

---

**Happy Learning and Gaming! 🎮🎓**

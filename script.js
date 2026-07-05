// ⚠️ لێرەدا کۆدی بەستنەوەی فایەربەیسەکەی خۆت دابنێ ⚠️
const firebaseConfig = {
    apiKey: "AIzaSyBJC7btI1oJpV867yOaWIiCVHGh58jYXlQ", 
    authDomain: "kozhir-killer.firebaseapp.com",
    databaseURL: "https://kozhir-killer-default-rtdb.firebaseio.com", 
    projectId: "kozhir-killer",
    storageBucket: "kozhir-killer.firebasestorage.app",
    messagingSenderId: "697346679054",
    appId: "1:697346679054:web:968c8499db5d019136375f"
};



// ڕووناککردنەوەی فایەربەیس
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// لیستی کەتەگۆرییەکان و وشەکانی ناو هەر دانەیەک
const gameData = {
    all: ["فڕۆکەخانە", "نەخۆشخانە", "بانک", "قوتابخانە", "سینەما", "چێشتخانە", "هۆتێل", "کەنار دەریا", "وێستگەی شەمەندەفەر", "مۆزەخانە", "سەربازگە", "سۆپەرمارکێت", "پۆلیسخانە", "پارک"],
    foods: ["کباب", "پیتزا", "بێەرگەر", "یاپراخ", "بریانی", "شۆربا", "کنتاکی", "فڵافل", "کێک", "ئایسکریم", "چای", "قاوە"],
    countries: ["کوردستان", "عێراق", "تورکیا", "ئێران", "ئەڵمانیا", "بەریتانیا", "ئەمەریکا", "فەڕەنسا", "ئیتاڵیا", "ژاپۆن", "میسر", "سعودیە"],
    movies: ["باتمان", "سوپەرمان", "سپایدەرمان", "تایتانیک", "تۆم و جێری", "هاری پۆتەر", "شێری پاشا", "مێستەربین", "جۆکەر", "نارۆتۆ"]
};

let currentLocations = gameData.all; 
let myName = "";
let roomCode = "";
let isHost = false;
let myId = "";
let gameTimer = null;

// توخمەکانی ڕووکار
const mainScreen = document.getElementById('main-screen');
const hostScreen = document.getElementById('host-screen');
const joinScreen = document.getElementById('join-screen');
const roleScreen = document.getElementById('role-screen');
const gameScreen = document.getElementById('game-screen');
const cardInner = document.getElementById('card-inner');

// دروستکردنی کۆدی ژووری ٤ ژمارەیی بەڕێکەوت
function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// کاتێک هۆست ژوور دروست دەکات
document.getElementById('btn-create-mode').addEventListener('click', () => {
    myName = document.getElementById('player-name').value.trim();
    if(!myName) return alert("تکایە سەرەتا ناوی خۆت بنووسە!");
    
    roomCode = generateRoomCode();
    isHost = true;
    myId = "host_" + Date.now();
    
    document.getElementById('host-room-code').textContent = roomCode;
    mainScreen.classList.add('hidden');
    hostScreen.classList.remove('hidden');
    
    database.ref('rooms/' + roomCode).set({
        status: "waiting",
        killerCount: 1,
        gameTime: 5,
        location: "",
        category: "all"
    });
    
    database.ref('rooms/' + roomCode + '/players/' + myId).set({ name: myName, role: "" });
    listenToPlayers();
    listenToGameStatus();
});

// کاتێک یاریزان کلیک دەکات بچێتە ناو ژوورێک
document.getElementById('btn-join-mode').addEventListener('click', () => {
    myName = document.getElementById('player-name').value.trim();
    if(!myName) return alert("تکایە سەرەتا ناوی خۆت بنووسە!");
    
    mainScreen.classList.add('hidden');
    joinScreen.classList.remove('hidden');
});

document.getElementById('btn-submit-join').addEventListener('click', () => {
    roomCode = document.getElementById('join-room-code').value.trim();
    myId = "player_" + Date.now();
    
    database.ref('rooms/' + roomCode).once('value', (snapshot) => {
        if(!snapshot.exists()) {
            alert("ئەم ژوورە بوونی نییە!");
        } else {
            document.getElementById('join-input-area').classList.add('hidden');
            document.getElementById('waiting-area').classList.remove('hidden');
            document.getElementById('joined-room-id').textContent = roomCode;
            
            database.ref('rooms/' + roomCode + '/players/' + myId).set({ name: myName, role: "" });
            listenToPlayers();
            listenToGameStatus();
        }
    });
});

// گوێگرتن لە لیستی یاریزانە ئۆنلاینەکان
function listenToPlayers() {
    database.ref('rooms/' + roomCode + '/players').on('value', (snapshot) => {
        const players = snapshot.val();
        let listHtml = "";
        let count = 0;
        
        for(let id in players) {
            listHtml += `<div class="player-name-item">👤 ${players[id].name}</div>`;
            count++;
        }
        
        if(isHost) {
            document.getElementById('host-player-list').innerHTML = listHtml;
            document.getElementById('player-count-text').textContent = count;
        } else {
            document.getElementById('join-player-list').innerHTML = listHtml;
        }
    });
}

// کاتێک هۆست یاری دەستپێدەکات بە کەتەگۆری دیاریکراوەوە
document.getElementById('btn-start-game').addEventListener('click', () => {
    database.ref('rooms/' + roomCode + '/players').once('value', (snapshot) => {
        const players = snapshot.val();
        if (!players) return;

        const playerIds = Object.keys(players);
        const playerCount = playerIds.length;
        const killerCount = parseInt(document.getElementById('killer-count').value);
        const gameTime = parseInt(document.getElementById('game-time').value);
        
        const selectedCategory = document.getElementById('category-select').value;
        currentLocations = gameData[selectedCategory] || gameData.all;

        if(playerCount < 3) return alert("پێویستە لانی کەم ٣ یاریزان لە ژوورەکەدا بن!");
        if(killerCount >= playerCount) return alert("نابێت ژمارەی کوژەرەکان لە یاریزانەکان زیاتر بێت!");

        const chosenLocation = currentLocations[Math.floor(Math.random() * currentLocations.length)];
        
        playerIds.forEach(id => {
            players[id].role = chosenLocation;
        });
        
        let assigned = 0;
        while(assigned < killerCount) {
            const randId = playerIds[Math.floor(Math.random() * playerCount)];
            if(players[randId].role !== "تۆ کوژەریت! (Kozher)") {
                players[randId].role = "تۆ کوژەریت! (Kozher)";
                assigned++;
            }
        }
        
        database.ref('rooms/' + roomCode).update({
            category: selectedCategory,
            gameTime: gameTime,
            players: players,
            status: "started"
        });
    });
});

// وەرگێڕانی کارت بۆ بینینی ڕۆڵەکە
document.getElementById('card').addEventListener('click', () => {
    cardInner.classList.toggle('flipped');
    
    if (isHost && !gameTimer) {
        database.ref('rooms/' + roomCode).once('value', (snapshot) => {
            const roomData = snapshot.val();
            if (roomData && roomData.status === "started") {
                const gameTime = roomData.gameTime || 5;
                const endTime = Date.now() + (gameTime * 60 * 1000);
                
                database.ref('rooms/' + roomCode).update({
                    status: "playing",
                    endTime: endTime
                });
            }
        });
    }
});

// ڕووداوەکانی ناو یاری کاتێک داتابەیس نوێ دەبێتەوە
function listenToGameStatus() {
    database.ref('rooms/' + roomCode).on('value', (snapshot) => {
        const roomData = snapshot.val();
        if(!roomData) return;
        
        if(roomData.status === "started" && roleScreen.classList.contains('hidden')) {
            hostScreen.classList.add('hidden');
            joinScreen.classList.add('hidden');
            roleScreen.classList.remove('hidden');
            
            document.getElementById('role-text').textContent = roomData.players[myId].role;
        }
        
        if(roomData.status === "playing" && gameScreen.classList.contains('hidden')) {
            roleScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            startLocalTimer(roomData.endTime);
        }
        
        if(roomData.status === "waiting" && !gameScreen.classList.contains('hidden')) {
            location.reload();
        }
    });
}

function startLocalTimer(endTime) {
    database.ref('rooms/' + roomCode).once('value', (snapshot) => {
        const roomData = snapshot.val();
        if (roomData) {
            const cat = roomData.category || "all";
            currentLocations = gameData[cat] || gameData.all;

            const listDiv = document.getElementById('locations-list');
            listDiv.innerHTML = '';
            currentLocations.forEach(loc => {
                listDiv.innerHTML += `<div class="location-item">${loc}</div>`;
            });
        }
    });

    clearInterval(gameTimer);
    gameTimer = setInterval(() => {
        let now = Date.now();
        let diff = endTime - now;
        
        if(diff <= 0) {
            clearInterval(gameTimer);
            document.getElementById('timer').textContent = "کاتی یاری تەواو بوو!";
            return;
        }
        
        let totalSec = Math.floor(diff / 1000);
        let min = Math.floor(totalSec / 60);
        let sec = totalSec % 60;
        document.getElementById('timer').textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }, 1000);
}

// کۆتایی هێنان بە یاری
document.getElementById('btn-end-game').addEventListener('click', () => {
    if (isHost) {
        database.ref('rooms/' + roomCode + '/players').once('value', (snapshot) => {
            const players = snapshot.val();
            if (players) {
                for (let id in players) {
                    players[id].role = "";
                }
            }
            database.ref('rooms/' + roomCode).set({
                status: "waiting",
                killerCount: 1,
                gameTime: 5,
                location: "",
                players: players
            });
        });
    } else {
        location.reload();
    }
});
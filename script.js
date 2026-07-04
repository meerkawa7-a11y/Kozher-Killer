const firebaseConfig = {
    apiKey: "AIzaSyBJC7btI1oJpV867yOaWIiCVHGh58jYXlQ", // لێرە کلیلی فایەربەیسەکەت بنووسە
    authDomain: "kozhir-killer.firebaseapp.com",
    databaseURL: "https://kozhir-killer-default-rtdb.firebaseio.com", // 👈 ئەو بەستەرەی لێرە داتنابوو، دەبێت لای databaseURL بێت
    projectId: "kozhir-killer",
    storageBucket: "kozhir-killer.firebasestorage.app",
    messagingSenderId: "697346679054",
    appId: "1:697346679054:web:968c8499db5d019136375f"
};

// ڕووناککردنەوەی فایەربەیس
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const locations = ["فڕۆکەخانە", "نەخۆشخانە", "بانک", "قوتابخانە", "سینەما", "چێشتخانە", "هۆتێل", "کەنار دەریا", "وێستگەی شەمەندەفەر", "مۆزەخانە", "سەربازگە", "سۆپەرمارکێت", "پۆلیسخانە", "پارک"];

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
    
    // پاشەکەوتکردن لە فایەربەیس
    database.ref('rooms/' + roomCode).set({
        status: "waiting",
        killerCount: 1,
        gameTime: 5,
        location: ""
    });
    
    // زیادکردنی هۆست وەک یاریزانی یەکەم
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

// کاتێک هۆست یاری دەستپێدەکات (دابەشکردنی ڕۆڵەکان بە ئۆنلاین)
document.getElementById('btn-start-game').addEventListener('click', () => {
    database.ref('rooms/' + roomCode + '/players').once('value', (snapshot) => {
        const players = snapshot.val();
        const playerIds = Object.keys(players);
        const playerCount = playerIds.length;
        const killerCount = parseInt(document.getElementById('killer-count').value);
        const gameTime = parseInt(document.getElementById('game-time').value);
        
        if(playerCount < 3) return alert("پێویستە لانی کەم ٣ یاریزان لە ژوورەکەدا بن!");
        if(killerCount >= playerCount) return alert("نابێت ژمارەی کوژەرەکان لە یاریزانەکان زیاتر بێت!");

        const chosenLocation = locations[Math.floor(Math.random() * locations.length)];
        
        // سەرەتا هەمووان دەکەینە هاووڵاتی و شوێنەکەیان دەدەینێ
        playerIds.forEach(id => {
            players[id].role = chosenLocation;
        });
        
        // دیاریکردنی کوژەرەکان بە هەڕەمەکی
        let assigned = 0;
        while(assigned < killerCount) {
            const randId = playerIds[Math.floor(Math.random() * playerCount)];
            if(players[randId].role !== "تۆ کوژەریت! (Kozher)") {
                players[randId].role = "تۆ کوژەریت! (Kozher)";
                assigned++;
            }
        }
        
        // نوێکردنەوەی داتابەیس بۆ دەستپێکردنی یاری لای هەمووان
        database.ref('rooms/' + roomCode).update({
            status: "started",
            gameTime: gameTime,
            players: players
        });
    });
});

// گوێگرتن لە بارودۆخی یاری لای یاریزانە ئاساییەکان
function listenToGameStatus() {
    database.ref('rooms/' + roomCode).on('value', (snapshot) => {
        const roomData = snapshot.val();
        if(!roomData) return;
        
        if(roomData.status === "started" && roleScreen.classList.contains('hidden') && gameScreen.classList.contains('hidden')) {
            // پیشاندانی کارتی ڕۆڵەکە
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
            // ئەگەر یاری کۆتایی هات بگەڕێوە سەرەتا
            location.reload();
        }
    });
}

// وەرگێڕانی کارت و چوونە ناو یاری سەرەکی
document.getElementById('card').addEventListener('click', () => {
    if(!cardInner.classList.contains('flipped')) {
        cardInner.classList.add('flipped');
        
        // ئەگەر هۆست بوو، دوای بینینی کارتەکە با کاتژمێری گشتی دەستپێبکات لای هەمووان
        if(isHost) {
            setTimeout(() => {
                database.ref('rooms/' + roomCode).once('value', (snapshot) => {
                    const gameTime = snapshot.val().gameTime;
                    const endTime = Date.now() + (gameTime * 60 * 1000);
                    database.ref('rooms/' + roomCode).update({
                        status: "playing",
                        endTime: endTime
                    });
                });
            }, 2000);
        }
    }
});

function startLocalTimer(endTime) {
    // پیشاندانی لیستی شوێنەکان
    const listDiv = document.getElementById('locations-list');
    listDiv.innerHTML = '';
    locations.forEach(loc => {
        listDiv.innerHTML += `<div class="location-item">${loc}</div>`;
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
    if(isHost) {
        database.ref('rooms/' + roomCode).remove(); // سڕینەوەی ژوورەکە لە فایەربەیس
        location.reload();
    } else {
        location.reload();
    }
});
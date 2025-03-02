// Canvas ayarları ve global değişkenler
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let userName = "";
let scoreSubmitted = false;

/* Global Ayarlar (zorlaştırılmış) */
let enemySpeedMultiplier = 1.3;
let enemyBaseHP = 1.3;
let waterDamage = 1;
let balance = 500.0;
let faucetHP = 3;
let gameOver = false;

/* Seviye & XP Sistemi */
let playerXP = 0;
let currentLevel = 1;
let xpThreshold = 100;
let bestLevel = 0;
let bestXP = 0;

/* Özel Yetenek Ayarları */
const specialAbilityCooldown = 60000;
let specialAbilityLastUsed = -specialAbilityCooldown;

/* Upgrade Maliyetleri */
let costFaster = 2;
let costStronger = 2;
let costSlow = 2;
document.getElementById('costFaster').innerText = costFaster;
document.getElementById('costStronger').innerText = costStronger;
document.getElementById('costSlow').innerText = costSlow;

/* Can Alma Maliyeti */
let costHealth = 20;
document.getElementById('costHealth').innerText = costHealth;

/* Yatırım */
let investmentLevel = 0;
let investCost = 50;
document.getElementById('invest').innerText = "Yatırım ($" + investCost + ")";
const baseIncome = 5;
function updateIncome() {
  let income = (baseIncome + investmentLevel * 0.5) * currentLevel * 0.5 * 1.3;
  document.getElementById('income').innerText = "Income: $" + income.toFixed(2) + "/s";
}
const incomeInterval = setInterval(() => {
  if (!gameOver) {
    let income = (baseIncome + investmentLevel * 0.5) * currentLevel * 0.5 * 1.3;
    balance += income;
    updateBalance();
  }
}, 1000);

/* Güncelleme Fonksiyonları */
function updateBalance() {
  document.getElementById('balance').innerText = "Balance: $" + balance.toFixed(2);
}
function updateHealth() {
  document.getElementById('health').innerText = "Health: " + faucetHP;
}
function updateLevelInfo() {
  document.getElementById('levelInfo').innerText =
    "Level: " + currentLevel + " | XP: " + playerXP + "/" + xpThreshold;
}

/* Genel en iyi skorun güncellenmesi */
function fetchOverallBest() {
  fetch('http://localhost:3000/getOverallBest') // Render URL’si ile değiştirin
    .then(response => response.json())
    .then(data => {
      if (data && data.username !== undefined && data.level !== undefined) {
        document.getElementById('overallBest').innerText = "Best: " + data.username + " - Level: " + data.level;
      } else {
        document.getElementById('overallBest').innerText = "Best: -";
      }
    })
    .catch(error => {
      console.error('Genel en iyi skor alınamadı:', error);
      document.getElementById('overallBest').innerText = "Best: -";
    });
}

/* Skor tablosunu çekme fonksiyonu */
function fetchTopScores() {
  fetch('http://localhost:3000/getTopScores') // Render URL’si ile değiştirin
    .then(response => response.json())
    .then(data => {
      const tbody = document.querySelector('#topScoresTable tbody');
      tbody.innerHTML = '';
      data.forEach((score, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${score.username}</td>
          <td>${score.level}</td>
          <td>${score.xp}</td>
        `;
        tbody.appendChild(row);
      });
      document.getElementById('scoreboardModal').style.display = 'block';
    })
    .catch(error => {
      console.error('En iyi skorlar alınamadı:', error);
      const tbody = document.querySelector('#topScoresTable tbody');
      tbody.innerHTML = '<tr><td colspan="4">Skorlar yüklenemedi.</td></tr>';
      document.getElementById('scoreboardModal').style.display = 'block';
    });
}

/* Görev Sistemi */
let missions = [];
function generateMissions() {
  const monsterMissionsPool = [
    { type: "kill_fire", description: "Fire canavarı öldür 5 kez", target: 5 },
    { type: "kill_ice", description: "Ice canavarı öldür 3 kez", target: 3 },
    { type: "kill_green", description: "Green canavarı öldür 4 kez", target: 4 },
    { type: "kill_purple", description: "Purple canavarı öldür 4 kez", target: 4 },
    { type: "kill_brown", description: "Brown canavarı öldür 3 kez", target: 3 },
    { type: "kill_boss", description: "Boss öldür 1 kez", target: 1 },
    { type: "kill_slowboss", description: "Slow Boss öldür 1 kez", target: 1 }
  ];
  const upgradeMissionsPool = [
    { type: "upgrade", description: "Yükseltme yap 2 kez", target: 2 }
  ];
  monsterMissionsPool.sort(() => Math.random() - 0.5);
  const selectedMissions = [];
  selectedMissions.push(monsterMissionsPool[0]);
  selectedMissions.push(monsterMissionsPool[1]);
  const upgradeMission = upgradeMissionsPool[Math.floor(Math.random() * upgradeMissionsPool.length)];
  selectedMissions.push(upgradeMission);
  selectedMissions.forEach(m => m.progress = 0);
  missions = selectedMissions;
  updateMissionsDisplay();
}
function updateMissionsDisplay() {
  const missionsDiv = document.getElementById('missions');
  let html = "<h3>Görevler</h3>";
  missions.forEach(m => {
    html += `<div>${m.description} (${m.progress}/${m.target})</div>`;
  });
  missionsDiv.innerHTML = html;
}
function updateMissionProgress(type, count) {
  missions.forEach(mission => {
    if (mission.type === type) {
      mission.progress += count;
    }
  });
  updateMissionsDisplay();
  if (missions.every(m => m.progress >= m.target)) {
    playerXP += currentLevel * 1000;
    updateLevelInfo();
    generateMissions();
  }
}
generateMissions();

/* Düşman güçlenmesi: Her 5 sn */
setInterval(() => {
  enemySpeedMultiplier += 0.65;
  enemyBaseHP += 2.6;
  console.log("Güçlendi:", enemySpeedMultiplier, enemyBaseHP);
}, 5000);

/* Dağ ve musluk koordinatları */
const mountain = {
  peak: { x: canvas.width / 2, y: canvas.height * 0.2 },
  leftBase: { x: canvas.width * 0.1, y: canvas.height * 0.9 },
  rightBase: { x: canvas.width * 0.9, y: canvas.height * 0.9 }
};
const faucet = {
  x: mountain.peak.x,
  y: mountain.peak.y,
  fireRate: 1000,
  lastShot: 0
};

/* Düşman ve Boss dizileri */
let enemies = [];
let bosses = [];
let waters = [];

/* Özel Canavar Tipleri */
class Fire {
  constructor() {
    const baseX = Math.random() * (mountain.rightBase.x - mountain.leftBase.x) + mountain.leftBase.x;
    this.x = baseX;
    this.y = canvas.height * 0.9;
    const dx = faucet.x - this.x;
    const dy = faucet.y - this.y;
    const distance = Math.hypot(dx, dy);
    this.baseVx = (dx / distance) * 1.0;
    this.baseVy = (dy / distance) * 1.0;
    this.radius = 15;
    this.hp = enemyBaseHP * 0.7;
    this.maxHP = this.hp;
    this.difficulty = 1;
  }
  update() {
    this.x += this.baseVx * enemySpeedMultiplier;
    this.y += this.baseVy * enemySpeedMultiplier;
  }
  draw() {
    ctx.beginPath();
    ctx.fillStyle = 'orange';
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(Math.floor(this.hp), this.x, this.y + 4);
  }
}

class IceEnemy {
  constructor() {
    const baseX = Math.random() * (mountain.rightBase.x - mountain.leftBase.x) + mountain.leftBase.x;
    this.x = baseX;
    this.y = canvas.height * 0.9;
    const dx = faucet.x - this.x;
    const dy = faucet.y - this.y;
    const distance = Math.hypot(dx, dy);
    this.baseVx = (dx / distance) * 0.8;
    this.baseVy = (dy / distance) * 0.8;
    this.radius = 15;
    this.hp = enemyBaseHP * 1.5 * 0.7;
    this.maxHP = this.hp;
    this.difficulty = 2;
  }
  update() {
    this.x += this.baseVx * enemySpeedMultiplier;
    this.y += this.baseVy * enemySpeedMultiplier;
  }
  draw() {
    ctx.beginPath();
    ctx.fillStyle = 'cyan';
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(Math.floor(this.hp), this.x, this.y + 4);
  }
}

class GreenEnemy {
  constructor() {
    const baseX = Math.random() * (mountain.rightBase.x - mountain.leftBase.x) + mountain.leftBase.x;
    this.x = baseX;
    this.y = canvas.height * 0.9;
    const dx = faucet.x - this.x;
    const dy = faucet.y - this.y;
    const distance = Math.hypot(dx, dy);
    this.baseVx = (dx / distance) * 1.2;
    this.baseVy = (dy / distance) * 1.2;
    this.radius = 15;
    this.hp = enemyBaseHP * 0.7;
    this.maxHP = this.hp;
    this.difficulty = 3;
  }
  update() {
    this.x += this.baseVx * enemySpeedMultiplier;
    this.y += this.baseVy * enemySpeedMultiplier;
  }
  draw() {
    ctx.beginPath();
    ctx.fillStyle = 'lime';
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(Math.floor(this.hp), this.x, this.y + 4);
  }
}

class PurpleEnemy {
  constructor() {
    const baseX = Math.random() * (mountain.rightBase.x - mountain.leftBase.x) + mountain.leftBase.x;
    this.x = baseX;
    this.y = canvas.height * 0.9;
    const dx = faucet.x - this.x;
    const dy = faucet.y - this.y;
    const distance = Math.hypot(dx, dy);
    this.baseVx = (dx / distance) * 0.9;
    this.baseVy = (dy / distance) * 0.9;
    this.radius = 15;
    this.hp = enemyBaseHP * 2 * 0.7;
    this.maxHP = this.hp;
    this.difficulty = 4;
  }
  update() {
    this.x += this.baseVx * enemySpeedMultiplier;
    this.y += this.baseVy * enemySpeedMultiplier;
  }
  draw() {
    ctx.beginPath();
    ctx.fillStyle = 'purple';
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(Math.floor(this.hp), this.x, this.y + 4);
  }
}

class BrownEnemy {
  constructor() {
    const baseX = Math.random() * (mountain.rightBase.x - mountain.leftBase.x) + mountain.leftBase.x;
    this.x = baseX;
    this.y = canvas.height * 0.9;
    const dx = faucet.x - this.x;
    const dy = faucet.y - this.y;
    const distance = Math.hypot(dx, dy);
    this.baseVx = (dx / distance) * 1.0;
    this.baseVy = (dy / distance) * 1.0;
    this.radius = 15;
    this.hp = enemyBaseHP * 0.7;
    this.maxHP = this.hp;
    this.difficulty = 2;
  }
  update() {
    this.x += this.baseVx * enemySpeedMultiplier;
    this.y += this.baseVy * enemySpeedMultiplier;
  }
  draw() {
    ctx.beginPath();
    ctx.fillStyle = 'brown';
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(Math.floor(this.hp), this.x, this.y + 4);
  }
}

class Boss {
  constructor() {
    const baseX = Math.random() * (mountain.rightBase.x - mountain.leftBase.x) + mountain.leftBase.x;
    this.x = baseX;
    this.y = canvas.height * 0.9;
    const dx = faucet.x - this.x;
    const dy = faucet.y - this.y;
    const distance = Math.hypot(dx, dy);
    this.baseVx = (dx / distance) * 3;
    this.baseVy = (dy / distance) * 3;
    this.radius = 20;
    this.hp = enemyBaseHP * 5 * 0.7;
    this.maxHP = this.hp;
    this.difficulty = 5;
  }
  update() {
    this.x += this.baseVx * enemySpeedMultiplier;
    this.y += this.baseVy * enemySpeedMultiplier;
  }
  draw() {
    ctx.beginPath();
    ctx.fillStyle = 'green';
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(Math.floor(this.hp), this.x, this.y + 5);
  }
}

class SlowBoss {
  constructor() {
    const baseX = Math.random() * (mountain.rightBase.x - mountain.leftBase.x) + mountain.leftBase.x;
    this.x = baseX;
    this.y = canvas.height * 0.9;
    const dx = faucet.x - this.x;
    const dy = faucet.y - this.y;
    const distance = Math.hypot(dx, dy);
    this.baseVx = (dx / distance) * 0.5;
    this.baseVy = (dy / distance) * 0.5;
    this.radius = 25;
    this.hp = enemyBaseHP * 20 * 0.7;
    this.maxHP = this.hp;
    this.difficulty = 6;
  }
  update() {
    this.x += this.baseVx * enemySpeedMultiplier;
    this.y += this.baseVy * enemySpeedMultiplier;
  }
  draw() {
    ctx.beginPath();
    ctx.fillStyle = 'darkblue';
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(Math.floor(this.hp), this.x, this.y + 6);
  }
}

/* Su Mermisi Sınıfı */
class Water {
  constructor(target, angleOffset = 0) {
    this.x = faucet.x;
    this.y = faucet.y;
    const dx = target.x - faucet.x;
    const dy = target.y - faucet.y;
    let angle = Math.atan2(dy, dx) + angleOffset;
    this.vx = Math.cos(angle) * 4.0;
    this.vy = Math.sin(angle) * 4.0;
    this.radius = 5;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
  }
  draw() {
    ctx.beginPath();
    ctx.fillStyle = 'aqua';
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* Hedef seçimi */
function selectTarget() {
  let potentialTargets = enemies.concat(bosses);
  if (potentialTargets.length === 0) return null;
  let target = potentialTargets[0];
  for (let t of potentialTargets) {
    if (t.y < target.y) {
      target = t;
    }
  }
  return target;
}

/* Düşman oluşturma: Her 308 ms */
let lastEnemySpawn = 0;
function spawnEnemy(timestamp) {
  if (timestamp - lastEnemySpawn > 308) {
    const r = Math.random();
    let enemy;
    if (r < 0.2) {
      enemy = new Fire();
    } else if (r < 0.4) {
      enemy = new IceEnemy();
    } else if (r < 0.6) {
      enemy = new GreenEnemy();
    } else if (r < 0.8) {
      enemy = new PurpleEnemy();
    } else {
      enemy = new BrownEnemy();
    }
    enemies.push(enemy);
    lastEnemySpawn = timestamp;
  }
}

/* Boss oluşturma: Her 23.077 ms */
let lastBossSpawn = 0;
function spawnBoss(timestamp) {
  if (timestamp - lastBossSpawn > 23077) {
    if (Math.random() < 0.5) {
      bosses.push(new Boss());
    } else {
      bosses.push(new SlowBoss());
    }
    lastBossSpawn = timestamp;
  }
}

/* Seviye atlaması */
function checkLevelUp() {
  if (playerXP >= xpThreshold) {
    currentLevel++;
    playerXP -= xpThreshold;
    xpThreshold = Math.floor(xpThreshold * 1.5);
    updateLevelInfo();
    updateIncome();
  }
}

/* Yükseltme seviyelerini takip eden değişkenler */
let strongerLevel = 1;
let slowLevel = 1;

/* Upgrade Butonları */
document.getElementById('fasterShot').addEventListener('click', () => {
  if (costFaster > 10) return;
  if (balance >= costFaster) {
    balance -= costFaster;
    if (faucet.fireRate > 200) {
      faucet.fireRate = Math.max(200, faucet.fireRate - 200);
    } else if (typeof window.multiShotLevel !== 'undefined' && window.multiShotLevel < 3) {
      window.multiShotLevel++;
    }
    costFaster++;
    if (costFaster > 10) {
      document.getElementById('costFaster').innerText = "MAX";
      document.getElementById('fasterShot').disabled = true;
    } else {
      document.getElementById('costFaster').innerText = costFaster;
    }
    updateBalance();
    updateMissionProgress("upgrade", 1);
  }
});

document.getElementById('strongerShot').addEventListener('click', () => {
  if (balance >= costStronger) {
    balance -= costStronger;
    waterDamage += 1;
    costStronger++;
    strongerLevel++;
    document.getElementById('costStronger').innerText = costStronger;
    document.getElementById('strongerShot10x').innerText = "10x (x" + strongerLevel + ")";
    updateBalance();
    updateMissionProgress("upgrade", 1);
  }
});

document.getElementById('slowDown').addEventListener('click', () => {
  if (balance >= costSlow) {
    balance -= costSlow;
    enemySpeedMultiplier = Math.max(0.5, enemySpeedMultiplier - 0.3);
    costSlow++;
    slowLevel++;
    document.getElementById('costSlow').innerText = costSlow;
    document.getElementById('slowDown10x').innerText = "10x (x" + slowLevel + ")";
    updateBalance();
    updateMissionProgress("upgrade", 1);
  }
});

/* 10x Butonları */
document.getElementById('strongerShot10x').addEventListener('click', () => {
  for (let i = 0; i < 10; i++) {
    if (balance >= costStronger) {
      balance -= costStronger;
      waterDamage += 1;
      costStronger++;
      strongerLevel++;
      updateMissionProgress("upgrade", 1);
    } else {
      break;
    }
  }
  document.getElementById('costStronger').innerText = costStronger;
  document.getElementById('strongerShot10x').innerText = "10x (x" + strongerLevel + ")";
  updateBalance();
});

document.getElementById('slowDown10x').addEventListener('click', () => {
  for (let i = 0; i < 10; i++) {
    if (balance >= costSlow) {
      balance -= costSlow;
      enemySpeedMultiplier = Math.max(0.5, enemySpeedMultiplier - 0.3);
      costSlow++;
      slowLevel++;
      updateMissionProgress("upgrade", 1);
    } else {
      break;
    }
  }
  document.getElementById('costSlow').innerText = costSlow;
  document.getElementById('slowDown10x').innerText = "10x (x" + slowLevel + ")";
  updateBalance();
});

/* Can Al Butonu */
document.getElementById('buyHealth').addEventListener('click', () => {
  if (balance >= costHealth) {
    balance -= costHealth;
    faucetHP++;
    updateBalance();
    updateHealth();
    updateMissionProgress("buyHealth", 1);
    costHealth += 20;
    document.getElementById('costHealth').innerText = costHealth;
  }
});

/* Invest Butonu */
document.getElementById('invest').addEventListener('click', () => {
  if (balance >= investCost) {
    balance -= investCost;
    investmentLevel++;
    investCost = Math.floor(investCost * 1.2);
    document.getElementById('invest').innerText = "Yatırım ($" + investCost + ")";
    updateBalance();
    updateIncome();
    updateMissionProgress("invest", 1);
  }
});

/* Özel Yetenek */
document.getElementById('specialAbility').addEventListener('click', () => {
  const now = performance.now();
  if (now - specialAbilityLastUsed >= 60000) {
    const specialDamage = currentLevel * 50;
    for (let i = enemies.length - 1; i >= 0; i--) {
      enemies[i].hp -= specialDamage;
      if (Math.floor(enemies[i].hp) <= 0) {
        if (enemies[i] instanceof Fire) updateMissionProgress("kill_fire", 1);
        else if (enemies[i] instanceof IceEnemy) updateMissionProgress("kill_ice", 1);
        else if (enemies[i] instanceof GreenEnemy) updateMissionProgress("kill_green", 1);
        else if (enemies[i] instanceof PurpleEnemy) updateMissionProgress("kill_purple", 1);
        else if (enemies[i] instanceof BrownEnemy) updateMissionProgress("kill_brown", 1);
        playerXP += enemies[i].difficulty * 10;
        balance += 1 + enemies[i].maxHP / 8;
        enemies.splice(i, 1);
        checkLevelUp();
      }
    }
    for (let i = bosses.length - 1; i >= 0; i--) {
      bosses[i].hp -= specialDamage;
      if (Math.floor(bosses[i].hp) <= 0) {
        if (bosses[i] instanceof Boss) updateMissionProgress("kill_boss", 1);
        else if (bosses[i] instanceof SlowBoss) updateMissionProgress("kill_slowboss", 1);
        playerXP += bosses[i].difficulty * 10;
        balance += 1 + bosses[i].maxHP / 8;
        bosses.splice(i, 1);
        checkLevelUp();
      }
    }
    specialAbilityLastUsed = now;
    document.getElementById('specialAbility').innerText = "Special (Cooldown)";
    setTimeout(() => {
      document.getElementById('specialAbility').innerText = "Special";
    }, 1000);
    updateBalance();
    updateLevelInfo();
  }
});

/* Oyun Reset Fonksiyonu */
function resetGame() {
  enemySpeedMultiplier = 1.3;
  enemyBaseHP = 1.3;
  waterDamage = 1;
  balance = 50.0;
  faucetHP = 3;
  playerXP = 0;
  currentLevel = 1;
  xpThreshold = 100;
  faucet.fireRate = 1000;
  
  enemies = [];
  bosses = [];
  waters = [];
  
  costFaster = 2;
  costStronger = 2;
  costSlow = 2;
  investCost = 50;
  investmentLevel = 0;
  costHealth = 20;
  strongerLevel = 1;
  slowLevel = 1;
  
  document.getElementById('costFaster').innerText = costFaster;
  document.getElementById('costStronger').innerText = costStronger;
  document.getElementById('costSlow').innerText = costSlow;
  document.getElementById('invest').innerText = "Yatırım ($" + investCost + ")";
  document.getElementById('costHealth').innerText = costHealth;
  document.getElementById('strongerShot10x').innerText = "10x (x" + strongerLevel + ")";
  document.getElementById('slowDown10x').innerText = "10x (x" + slowLevel + ")";
  
  document.getElementById('fasterShot').disabled = false;
  
  updateBalance();
  updateHealth();
  updateLevelInfo();
  updateIncome();
  
  gameOver = false;
  scoreSubmitted = false;
  document.getElementById('newGame').style.display = 'none';
  faucet.lastShot = 0;
  specialAbilityLastUsed = -specialAbilityCooldown;
  window.multiShotLevel = 1;
  generateMissions();
  fetchOverallBest(); // Yeni: Oyun başladığında en iyi skoru çek
}

/* "Oyuna Başla" butonuna tıklanması */
document.getElementById('startGame').addEventListener('click', () => {
  let inputName = document.getElementById('userNameInput').value.trim();
  const errorMessage = document.getElementById('errorMessage');
  if (inputName === "") {
    errorMessage.textContent = "Lütfen bir kullanıcı adı girin!";
    errorMessage.style.display = 'block';
    return;
  }
  errorMessage.style.display = 'none';
  userName = inputName;
  document.getElementById('welcomeScreen').style.display = "none";
  let storedBest = localStorage.getItem("bestScore_" + userName);
  if (storedBest) {
    let bestObj = JSON.parse(storedBest);
    bestLevel = bestObj.bestLevel;
    bestXP = bestObj.bestXP;
  } else {
    bestLevel = 0;
    bestXP = 0;
  }
  resetGame();
  requestAnimationFrame(gameLoop);
});

/* "New Game" butonuna tıklanması */
document.getElementById('newGame').addEventListener('click', () => {
  resetGame();
  requestAnimationFrame(gameLoop);
});

/* Skor Tablosu Butonu */
document.getElementById('showScoreboard').addEventListener('click', () => {
  fetchTopScores();
});

/* Modal Kapatma */
document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('scoreboardModal').style.display = 'none';
});

/* Oyun Döngüsü */
function gameLoop(timestamp) {
  if (gameOver) {
    let storedBest = localStorage.getItem("bestScore_" + userName);
    let bestObj = storedBest ? JSON.parse(storedBest) : { bestLevel: 0, bestXP: 0 };
    if (currentLevel > bestObj.bestLevel || (currentLevel === bestObj.bestLevel && playerXP > bestObj.bestXP)) {
      bestObj.bestLevel = currentLevel;
      bestObj.bestXP = playerXP;
      localStorage.setItem("bestScore_" + userName, JSON.stringify(bestObj));
    }
    bestLevel = bestObj.bestLevel;
    bestXP = bestObj.bestXP;
    
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "red";
    ctx.font = "bold 72px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 60);
    ctx.font = "bold 32px Arial";
    ctx.fillText("Seviyen: " + currentLevel + " | XP: " + playerXP, canvas.width / 2, canvas.height / 2);
    ctx.fillText(userName + " - Best: " + bestLevel + " | XP: " + bestXP, canvas.width / 2, canvas.height / 2 + 40);
    
    if (!scoreSubmitted) {
      fetch('http://localhost:3000/submitScore', { // Render URL’si ile değiştirin
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userName, level: currentLevel, xp: playerXP })
      })
      .then(response => response.json())
      .then(data => console.log('Skor gönderildi:', data))
      .catch(error => console.error('Skor gönderme hatası:', error));
      scoreSubmitted = true;
    }
    
    fetchOverallBest();
    
    document.getElementById('newGame').style.display = 'block';
    return;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.beginPath();
  ctx.moveTo(mountain.leftBase.x, mountain.leftBase.y);
  ctx.lineTo(mountain.peak.x, mountain.peak.y);
  ctx.lineTo(mountain.rightBase.x, mountain.rightBase.y);
  ctx.closePath();
  ctx.fillStyle = '#654321';
  ctx.fill();
  
  ctx.fillStyle = 'silver';
  ctx.fillRect(faucet.x - 10, faucet.y - 20, 20, 20);
  
  spawnEnemy(timestamp);
  spawnBoss(timestamp);
  
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.update();
    enemy.draw();
    const dx = enemy.x - faucet.x;
    const dy = enemy.y - faucet.y;
    if (Math.hypot(dx, dy) < 20) {
      faucetHP--;
      updateHealth();
      enemies.splice(i, 1);
      if (faucetHP <= 0) gameOver = true;
    }
    if (Math.floor(enemy.hp) <= 0) {
      if (enemy instanceof Fire) updateMissionProgress("kill_fire", 1);
      else if (enemy instanceof IceEnemy) updateMissionProgress("kill_ice", 1);
      else if (enemy instanceof GreenEnemy) updateMissionProgress("kill_green", 1);
      else if (enemy instanceof PurpleEnemy) updateMissionProgress("kill_purple", 1);
      else if (enemy instanceof BrownEnemy) updateMissionProgress("kill_brown", 1);
      playerXP += enemy.difficulty * 10;
      balance += 1 + enemy.maxHP / 8;
      updateBalance();
      updateLevelInfo();
      enemies.splice(i, 1);
      checkLevelUp();
    }
  }
  
  for (let i = bosses.length - 1; i >= 0; i--) {
    const boss = bosses[i];
    boss.update();
    boss.draw();
    const dx = boss.x - faucet.x;
    const dy = boss.y - faucet.y;
    if (Math.hypot(dx, dy) < 20) {
      faucetHP--;
      updateHealth();
      bosses.splice(i, 1);
      if (faucetHP <= 0) gameOver = true;
    }
    if (Math.floor(boss.hp) <= 0) {
      if (boss instanceof Boss) updateMissionProgress("kill_boss", 1);
      else if (boss instanceof SlowBoss) updateMissionProgress("kill_slowboss", 1);
      playerXP += boss.difficulty * 10;
      balance += 1 + boss.maxHP / 8;
      updateBalance();
      updateLevelInfo();
      bosses.splice(i, 1);
      checkLevelUp();
    }
  }
  
  if (timestamp - faucet.lastShot > faucet.fireRate) {
    let target = selectTarget();
    if (target) {
      for (let s = 0; s < window.multiShotLevel; s++) {
        let offset = 0;
        if (window.multiShotLevel === 2) { offset = (s === 0 ? -0.05 : 0.05); }
        else if (window.multiShotLevel === 3) { offset = (s === 0 ? -0.1 : (s === 1 ? 0 : 0.1)); }
        waters.push(new Water(target, offset));
      }
      faucet.lastShot = timestamp;
    }
  }
  
  for (let w = waters.length - 1; w >= 0; w--) {
    const water = waters[w];
    water.update();
    water.draw();
    let hit = false;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      const dx = water.x - enemy.x;
      const dy = water.y - enemy.y;
      if (Math.hypot(dx, dy) < enemy.radius + water.radius) {
        enemy.hp -= waterDamage;
        hit = true;
        if (Math.floor(enemy.hp) <= 0) {
          if (enemy instanceof Fire) updateMissionProgress("kill_fire", 1);
          else if (enemy instanceof IceEnemy) updateMissionProgress("kill_ice", 1);
          else if (enemy instanceof GreenEnemy) updateMissionProgress("kill_green", 1);
          else if (enemy instanceof PurpleEnemy) updateMissionProgress("kill_purple", 1);
          else if (enemy instanceof BrownEnemy) updateMissionProgress("kill_brown", 1);
          playerXP += enemy.difficulty * 10;
          balance += 1 + enemy.maxHP / 8;
          updateBalance();
          updateLevelInfo();
          enemies.splice(i, 1);
          checkLevelUp();
        }
        break;
      }
    }
    if (!hit) {
      for (let i = bosses.length - 1; i >= 0; i--) {
        const boss = bosses[i];
        const dx = water.x - boss.x;
        const dy = water.y - boss.y;
        if (Math.hypot(dx, dy) < boss.radius + water.radius) {
          boss.hp -= waterDamage;
          hit = true;
          if (Math.floor(boss.hp) <= 0) {
            if (boss instanceof Boss) updateMissionProgress("kill_boss", 1);
            else if (boss instanceof SlowBoss) updateMissionProgress("kill_slowboss", 1);
            playerXP += boss.difficulty * 10;
            balance += 1 + boss.maxHP / 8;
            updateBalance();
            updateLevelInfo();
            bosses.splice(i, 1);
            checkLevelUp();
          }
          break;
        }
      }
    }
    if (hit) waters.splice(w, 1);
  }
  
  const specialBtn = document.getElementById('specialAbility');
  const timeSinceSpecial = timestamp - specialAbilityLastUsed;
  if (timeSinceSpecial < 60000) {
    const remaining = Math.ceil((60000 - timeSinceSpecial) / 1000);
    specialBtn.innerText = remaining;
  } else {
    specialBtn.innerText = "Special";
  }
  
  requestAnimationFrame(gameLoop);
}
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'YES', // Buraya MySQL şifrenizi yazın
    database: 'tower_defense'
});

db.connect(err => {
    if (err) {
        console.error('MySQL bağlantı hatası:', err);
        return;
    }
    console.log('MySQL bağlandı.');
});

app.post('/submitScore', (req, res) => {
    const { username, level, xp } = req.body;
    const query = 'INSERT INTO scores (username, level, xp) VALUES (?, ?, ?)';
    db.query(query, [username, level, xp], (err, result) => {
        if (err) {
            console.error('Skor kaydedilemedi:', err);
            res.status(500).send({ error: 'Skor kaydedilemedi' });
            return;
        }
        res.send({ message: 'Skor başarıyla kaydedildi', id: result.insertId });
    });
});

app.get('/getOverallBest', (req, res) => {
    const query = 'SELECT username, level, xp FROM scores ORDER BY level DESC, xp DESC LIMIT 1';
    db.query(query, (err, results) => {
        if (err) {
            console.error('En iyi skor alınamadı:', err);
            res.status(500).send({ error: 'En iyi skor alınamadı' });
            return;
        }
        if (results.length > 0) {
            res.send(results[0]);
        } else {
            res.send({});
        }
    });
});

app.get('/getTopScores', (req, res) => {
    const query = 'SELECT username, level, xp FROM scores ORDER BY level DESC, xp DESC LIMIT 10';
    db.query(query, (err, results) => {
        if (err) {
            console.error('En iyi skorlar alınamadı:', err);
            res.status(500).send({ error: 'En iyi skorlar alınamadı' });
            return;
        }
        res.send(results);
    });
});

app.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
});
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Serve actor file with correct content type
app.get('/actors/earlyadopter', async (req, res) => {
    try {
        const actorFile = await fs.readFile(path.join(__dirname, '../actors/earlyadopter.json'), 'utf8');
        res.setHeader('Content-Type', 'application/activity+json');
        res.send(actorFile);
    } catch (error) {
        console.error('Error serving actor file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve webfinger endpoint
app.get('/.well-known/webfinger', async (req, res) => {
    try {
        const webfingerFile = await fs.readFile(path.join(__dirname, '../.well-known/webfinger'), 'utf8');
        res.setHeader('Content-Type', 'application/jrd+json');
        res.send(webfingerFile);
    } catch (error) {
        console.error('Error serving webfinger file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Inbox endpoint
app.post('/inbox', (req, res) => {
    const signatureHeader = req.headers['signature'];
    const dateHeader = req.headers['date'];
    const digestHeader = req.headers['digest'];

    if (!signatureHeader || !dateHeader || !digestHeader) {
        return res.status(403).json({ error: 'Missing required signature headers' });
    }

    res.setHeader('Content-Type', 'application/activity+json');
    res.status(200).json({
        '@context': 'https://www.w3.org/ns/activitystreams',
        'summary': 'Inbox for earlyadopter',
        'type': 'OrderedCollection', 
        'totalItems': 0,
        'orderedItems': [],
    });
});

app.post('/outbox', (req, res) => {
    const signatureHeader = req.headers['signature'];
    const dateHeader = req.headers['date'];
    const digestHeader = req.headers['digest'];

    if (!signatureHeader || !dateHeader || !digestHeader) {
        return res.status(403).json({ error: 'Missing required signature headers' });
    }

    res.setHeader('Content-Type', 'application/activity+json');
    res.status(200).json({
        '@context': 'https://www.w3.org/ns/activitystreams',
        'summary': 'Outbox for earlyadopter',
        'type': 'OrderedCollection', 
        'totalItems': 0,
        'orderedItems': [],
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`ActivityPub server running on port ${PORT}`);
}); 
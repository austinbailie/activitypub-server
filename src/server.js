const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const fs2 = require('fs');
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

initializeApp({
    credential: applicationDefault()
});
  
const db = getFirestore();

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for posts
let posts = [];

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());


function createSignedRequest(document, actorUrl) {
    // Create SHA-256 digest of the document
    const sha256 = crypto.createHash('sha256');
    sha256.update(document);
    const digest = `SHA-256=${sha256.digest('base64')}`;

    // Get current date in ISO format
    const date = new Date().toISOString();

    // Read private key
    const privateKey = fs2.readFileSync(path.join(__dirname, '../scripts/private.pem'), 'utf8');
    
    // Create the string to be signed
    const signedString = `(request-target): post /inbox\nhost: mastodon.social\ndate: ${date}\ndigest: ${digest}`;

    // Create the signature
    const signer = crypto.createSign('SHA256');
    signer.update(signedString);
    signer.end();
    const signature = signer.sign(privateKey, 'base64');

    // Create the header
    const header = `keyId="${actorUrl}",headers="(request-target) host date digest",signature="${signature}"`;

    return {
        signature: header,
        digest: digest,
        date: date
    };
}

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
app.post('/inbox', async (req, res) => {

    console.log('INBOX BODY', req.body);
    console.log('INBOX HEADERS', req.headers);

    const signatureHeader = req.headers['signature'];
    const dateHeader = req.headers['date'];
    const digestHeader = req.headers['digest'];

    if (!signatureHeader || !dateHeader || !digestHeader) {
        return res.status(403).json({ error: 'Missing required signature headers' });
    }

    const body = req.body;

    if (body.type == "Follow") {

        const respBody = {
            "@context": "https://www.w3.org/ns/activitystreams",
            "id": `https://activitypub-server-644161555271.us-west1.run.app/${Date.now()}`,
            "type": "Accept",
            "actor": "https://activitypub-server-644161555271.us-west1.run.app/actors/earlyadopter",
            "object": {
                ...body
            }
        }

        const signedRequest = createSignedRequest(JSON.stringify(respBody), 'https://activitypub-server-644161555271.us-west1.run.app/actors/earlyadopter');
        res.setHeader('Content-Type', 'application/activity+json');
        res.setHeader('User-Agent', 'ActivityPub-Server/1.0');
        res.setHeader('Accept', 'application/activity+json');
        res.setHeader('Signature', signedRequest.signature);
        res.setHeader('Date', signedRequest.date);
        res.setHeader('Digest', signedRequest.digest);

        console.log('INBOX RESP', respBody);

        const handle = body.object;
        const username = handle.substring(handle.lastIndexOf('@') + 1);

        const docRef = db.collection('followers').doc(username);

        await docRef.set({
            profileURL: handle
        });

        res.status(200).json(respBody); 

    } else {

        res.setHeader('Content-Type', 'application/activity+json');
        res.setHeader('User-Agent', 'ActivityPub-Server/1.0');
        res.setHeader('Accept', 'application/activity+json');
        res.status(200).json(); 
    }
});

app.get('/outbox', async (req, res) => {
    const signatureHeader = req.headers['signature'];
    const dateHeader = req.headers['date'];
    const digestHeader = req.headers['digest'];

    if (!signatureHeader || !dateHeader || !digestHeader) {
        return res.status(403).json({ error: 'Missing required signature headers' });
    }

    const snapshot = await db.collection('posts').get();

    let posts = []
    snapshot.forEach((doc) => {
        posts.push(doc.data())
    });

    // Return all posts in the outbox
    res.setHeader('Content-Type', 'application/activity+json');
    res.status(200).json({
        '@context': 'https://www.w3.org/ns/activitystreams',
        'summary': 'Outbox for earlyadopter',
        'type': 'OrderedCollection', 
        'totalItems': posts.length,
        'orderedItems': posts
    });
});

// Add a new endpoint to create posts
app.post('/create-post', async (req, res) => {
    console.log('DOCUMENT', req.body);
    const post = req.body;
  
    // Add the post to our storage
    const docRef = db.collection('posts').doc();

    await docRef.set({
        ...post
    });

    // Return the created post
    res.setHeader('Content-Type', 'application/activity+json');
    res.status(201).json(post);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`ActivityPub server running on port ${PORT}`);
}); 



app.get('/create-hello-world', async (req, res) => {
    try {
        const post = await fs.readFile(path.join(__dirname, '../scripts/create-hello-world.json'), 'utf8');
        res.setHeader('Content-Type', 'application/activity+json');
        res.send(post);
    } catch (error) {
        console.error('Error serving webfinger file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



app.get('/followers', async (req, res) => {

    const snapshot = await db.collection('followers').get();

    let profiles = []
    snapshot.forEach((doc) => {
        profiles.push(doc.data().profileURL)
    });

    res.setHeader('Content-Type', 'application/activity+json');
    res.status(200).json(
        {
            "@context": "https://www.w3.org/ns/activitystreams",
            "id": "https://activitypub-server-644161555271.us-west1.run.app/followers",
            "type": "OrderedCollectionPage",
            "totalItems": profiles.length,
            "orderedItems": profiles
          }
    );
});


app.get('/following', (req, res) => {
   
    res.setHeader('Content-Type', 'application/activity+json');
    res.status(200).json(
        {
            "@context": "https://www.w3.org/ns/activitystreams",
            "id": "https://activitypub-server-644161555271.us-west1.run.app/followers",
            "type": "OrderedCollectionPage",
            "totalItems": 0,
            "orderedItems": [

            ]
          }
    );
});
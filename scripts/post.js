const crypto = require('crypto');
const fs = require('fs');

async function createSignedRequest(document, actorUrl) {
    // Create SHA-256 digest of the document
    const sha256 = crypto.createHash('sha256');
    sha256.update(document);
    const digest = `SHA-256=${sha256.digest('base64')}`;

    // Get current date in HTTP format
    const date = new Date().toUTCString();

    // Read private key
    const privateKey = fs.readFileSync('private.pem', 'utf8');
    
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

// Example usage:
async function main() {
    const document = JSON.stringify(/* your ActivityPub document */);
    const actorUrl = 'https://your-server.com/actors/yourname';
    
    try {
        const signedRequest = await createSignedRequest(document, actorUrl);
        console.log('Signature:', signedRequest.signature);
        console.log('Digest:', signedRequest.digest);
        console.log('Date:', signedRequest.date);
    } catch (error) {
        console.error('Error:', error);
    }
}

module.exports = { createSignedRequest }; 
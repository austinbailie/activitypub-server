require 'http'
require 'openssl'
require 'logger'
require 'json'

logger = Logger.new(STDOUT) # Log to console
logger.level = Logger::DEBUG

#document = File.read('./create-hello-world.json')

document = {
	"@context": "https://www.w3.org/ns/activitystreams",
	"id": "https://activitypub-server-1040968594711.us-central1.run.app/create-hello-world/#{Time.now.utc.iso8601}",
	"type": "Create",
	"actor": "https://activitypub-server-1040968594711.us-central1.run.app/actors/earlyadopter",
	"object": {
		"id": "https://activitypub-server-1040968594711.us-central1.run.app/create-hello-world",
		"type": "Note",
		"published": "#{Time.now.utc.iso8601}",
		"attributedTo": "https://activitypub-server-1040968594711.us-central1.run.app/actors/earlyadopter",
		"content": "<p>Hello world from ActivityPub server</p>",
		"to": "https://www.w3.org/ns/activitystreams#Public"
	}
}
inbox_url = 'https://mastodon.social/inbox'
actor_url = 'https://activitypub-server-1040968594711.us-central1.run.app/actors/earlyadopter'

logger.debug("HTTP POST Request to #{inbox_url}")
logger.debug("Document being sent: #{document}")

sha256        = OpenSSL::Digest::SHA256.new
digest        = "SHA-256=" + Base64.strict_encode64(sha256.digest(document.to_json))
date          = Time.now.utc.httpdate
keypair       = OpenSSL::PKey::RSA.new(File.read('private.pem'))
signed_string = "(request-target): post /inbox\nhost: mastodon.social\ndate: #{date}\ndigest: #{digest}"
signature     = Base64.strict_encode64(keypair.sign(OpenSSL::Digest::SHA256.new, signed_string))
header        = "keyId=\"#{actor_url}\",headers=\"(request-target) host date digest\",signature=\"#{signature}\""

logger.debug("Date: #{date}")
logger.debug("Digest: #{digest}")
logger.debug("Signature header: #{header}")

# Add User-Agent header which some servers require
response = HTTP.headers({ 
  'Host': 'mastodon.social', 
  'Date': date, 
  'Signature': header, 
  'Digest': digest, 
  'Content-Type': 'application/activity+json',
  'User-Agent': 'ActivityPub Client/1.0',
  'Accept': 'application/activity+json',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive'
})
.post(inbox_url, body: document.to_json)

logger.debug("Response status: #{response.status}")
logger.debug("Response headers: #{response.headers}")
logger.debug("Response body: #{response.body}")

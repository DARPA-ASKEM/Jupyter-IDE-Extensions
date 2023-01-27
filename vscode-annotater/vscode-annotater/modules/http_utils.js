// @ts-nocheck
const fetch = require('node-fetch');


// Post to arbitrary URL
async function postToURL(url, body) {

	const post_body = body
	console.log("URL: ", url);
	console.log("POST BODY: ", post_body);
	// fs.writeFileSync("/tmp/output.json", post_body, 'utf-8');
	const outer_reponse = fetch(url, {
		method: 'POST',
		headers: {
			'Accept': '*/*',
			'Content-Type': 'application/json'
		},
		body: post_body
	}).then(response => {console.log(response); console.log(response.status); return response.json()}).catch(error => console.log(error));
	console.log("POST RESPONSE: ", await outer_reponse);
	return await outer_reponse;
}

async function getFromURL(url) {
	const reponse = fetch(url, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	}).then(reponse => reponse.json())
	return await reponse;
}

module.exports = {
    postToURL,
    getFromURL
}
// @ts-nocheck
const vscode = require('vscode');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const config = vscode.workspace.getConfiguration('vscodeAnnotater');


// Get data from elasticsearch endpoint
async function getFromES(id) {

	if (config.get("elasticsearch.enable")) {
		const url = config.get("elasticsearch.address") + 'vscode_annotations/_doc/' + id + '?pretty';

		const response = await fetch(url)
			.then(response => response.json());
		const responseValue = response;
		const responseSource = responseValue._source;
		console.log("RESPONSE SOURCE: ", responseSource);
		return await responseSource;
	}
	else {
		const filepath = path.join(config.get("data.folder"), id + ".json");
		console.log("READING: ", filepath);
		let responseSource = fs.readFileSync(filepath, 'utf8');
		try {
			responseSource = JSON.parse(responseSource);
			return responseSource;
		}
		catch (error) {
			return {};
		}
	}

}


// Push to elasticsearch endpoint.
function pushToES(id, annotation) {

	//REQUEST TO ELASTICSEARCH

	const body = JSON.stringify({ "annotations": annotation });

	if (config.get("elasticsearch.enable")) {

		const url = config.get("elasticsearch.address") + 'vscode_annotations/_doc/' + id + '?pretty';

		console.log("FULL URL: ", url);

		const response = fetch(url, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: body
		});

		console.log("Push response: ", response);
	}
	else {
		console.log("PUSHING to LOCAL FILES");
		const filepath = path.join(config.get("data.folder"), id + ".json");
		console.log("Writing file body: ", body);
		fs.writeFileSync(filepath, body, 'utf8');
	}

}

module.exports = {
    getFromES,
    pushToES
}
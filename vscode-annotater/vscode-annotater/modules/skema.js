// @ts-nocheck
const vscode = require('vscode');
const config = vscode.workspace.getConfiguration('vscodeAnnotater');

const http_utils = require('./http_utils');

// Post to SKEMA models to start variable extraction
async function toSkemaModels(gromet_json) {
	const url = config.get("askem.skema.address") + "models";
	const response = await http_utils.postToURL(url, gromet_json);
	return response;
}

async function getModelStates(model_id) {
	const url = config.get("askem.skema.address") + "models/" + model_id + "/named_opos";
	const response = await http_utils.getFromURL(url);
	return response;
}

async function getModelParameters(model_id) {
	const url = config.get("askem.skema.address") + "models/" + model_id + "/named_opis";
	const response = await http_utils.getFromURL(url)
	return response
}

async function getOPOSAndOPIS(model_id) {
	const url = "http://localhost:8003/" + "endpoint1";
	const response = await http_utils.postToURL(url, JSON.stringify(model_id));
	return response;
}

async function getPyACSet(opi_opo_json) {
    const url = "http://localhost:8003/" + "endpoint2";
	const response = await http_utils.postToURL(url, JSON.stringify(opi_opo_json));
	return response;
}

module.exports = {
    toSkemaModels,
    getModelStates,
    getModelParameters,
    getOPOSAndOPIS,
    getPyACSet
}
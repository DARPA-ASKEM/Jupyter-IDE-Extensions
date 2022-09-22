// @ts-nocheck

// The module 'vscode' contains the VS Code extensibility API
const vscode = require('vscode');
const fetch = require('node-fetch');

async function get_from_es(id) {

	const url = 'http://localhost:9201/vscode_annotations/_doc/' + id + '?pretty';

	const response = await fetch(url)
		.then(response => response.json());
	const response_value = response;
	const response_source = response_value._source;
	console.log("RESPONSE SOURCE: ", response_source);
	return await response_source;

}

function push_to_es(id, annotation) {

	//REQUEST TO ELASTICSEARCH

	const body = JSON.stringify({ "annotations": annotation });
	const url = 'http://localhost:9201/vscode_annotations/_doc/' + id + '?pretty';

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

async function post_to_url(url, body) {
	const response = fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: body
	}).then(response => response.json());
	console.log("POST RESPONSE: ", await response);
	return await response;
}

function decorate_lines(editor, range, annotation) {
	console.log("Decorating lines. Range: ", range);
	let rangeline = range.start.line;
	const decorationType = vscode.window.createTextEditorDecorationType({
		gutterIconPath: '/code/ASKEM-Testing/vscode-annotater/vscode-annotater/check-mark.svg',
		gutterIconSize: 'auto',
		after: {
			backgroundColor: '#4e4e4e',
			contentText: "Annotation: " + JSON.stringify(annotation[rangeline].userInput),
			margin: "0px 10px",
			width: '1000px',
			height: '25px'
		},

	});

	editor.setDecorations(decorationType, [range]);
}

async function load_previous_annotations() {
	const editor = vscode.window.activeTextEditor;
	const id = editor.document.fileName.split('/').pop();
	console.log("Document ID:", id);

	const annotations_response = await get_from_es(id);
	const annotations = annotations_response["annotations"];

	console.log(annotations, "type of: ", typeof (annotations));

	for (let annotationkey in annotations) {
		let annotation = annotations[annotationkey];
		console.log(annotation, "Range: ", annotation.range);
		let range = new vscode.Range(annotation.range[0], annotation.range[1]);
		decorate_lines(editor, range, annotations);
	}

}

async function run_input_form() {
	const pick_result = await vscode.window.showQuickPick(['variable', 'function', 'lambda'], {
		placeHolder: 'Choose type of annotation',
		onDidSelectItem: item => vscode.window.showInformationMessage(`Focus ${++i}: ${item}`)
	});
	const comment = await vscode.window.showInputBox({
		prompt: "Comment for your annotation:",
		placeHolder: "Comment",
	});

	const user_input = {
		"type": pick_result,
		"comment": comment
	};

	return user_input;

}

async function run_webview_form() {
	// Create and show a new webview
	const panel = vscode.window.createWebviewPanel(
		'annotation', // Identifies the type of the webview. Used internally
		'Annotation', // Title of the panel displayed to the user
		vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
		{
			enableScripts: true
		} // Webview options. More on these later.
	);

	// And set its HTML content
	panel.webview.html = getWebviewContent();

	// Handle messages from the webview
	panel.webview.onDidReceiveMessage(
		message => {
			switch (message.command) {
				case 'alert':
					vscode.window.showErrorMessage(message.text);
					return;
			}
		},
		undefined,
		context.subscriptions
	);
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Loads previous annotations upon activation.
	console.log("Loading previous annotations.");
	load_previous_annotations();

	// Registers command for opening arbitrary URL on 
	let http_open_disposable = vscode.commands.registerCommand('vscode-annotater.openBrowser', function () {
		vscode.env.openExternal(vscode.Uri.parse('https://jataware.com'));
	});

	//NOT FUNCTIONAL, NEED FURTHER REQUIREMENTS FROM UAZ? STUB
	let send_selection_to_endpoint = vscode.commands.registerCommand('vscode-annotater.sendSelection', async function () {
		const editor = vscode.window.activeTextEditor;
		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);

		//TODO send selection to endpoint
		const body = JSON.stringify({ "code": selectedText });
		const response = await post_to_url("https://uaz.url.edu", body);

		//TODO Replace text with returned API endpoint code
	});

	// Registers command to annotate a text selection.
	let disposable = vscode.commands.registerCommand('vscode-annotater.annotate', async function () {
		const editor = vscode.window.activeTextEditor;
		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);
		const id = editor.document.fileName.split('/').pop();
		const line = editor.selection.start.line;

		// Grab the selection range to store in annotation.
		let range = new vscode.Range(
			selection.start,
			selection.end
		);

		console.log(selection);

		let es_response = await get_from_es(id);
		console.log(es_response);

		//run_webview_form();

		const userInput = await run_input_form();

		if (userInput === 'undefined') {
			return false;
		}
		else {
			let annotation = {};
			annotation[line] = {
				"text": selectedText,
				"range": range,
				"userInput": userInput
			}

			push_to_es(id, annotation);
			console.log("ANNOTATION: ", annotation);

			decorate_lines(editor, range, annotation);
		}

	});

	// Registers a command to reload annotations manually.
	let reload = vscode.commands.registerCommand("vscode-annotater.reload", async function () {
		load_previous_annotations();
	});

	let entire_file_upload = vscode.commands.registerCommand("vscode-annotater.uploadFile", async function () {
		await vscode.commands.executeCommand('copyFilePath');
		let folder_file = await vscode.env.clipboard.readText();
		console.log("File: ", folder_file);
		let uri = "file://" + folder_file
		console.log("URI: ", uri);
		vscode.workspace.openTextDocument(folder_file).then((document) => {
			console.log("Document: ", document, "Line Count: ", document.lineCount);
		});

		run_webview_form();
	});

	// Pushes all disposable function calls to subscriptions.
	context.subscriptions.push(disposable);
	context.subscriptions.push(http_open_disposable);
	context.subscriptions.push(send_selection_to_endpoint);
	context.subscriptions.push(reload);
	context.subscriptions.push(entire_file_upload);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}



function getWebviewContent() {
	return `<!DOCTYPE html>
  <html lang="en">
  <head>
	  <meta charset="UTF-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1.0">
	  <title>Annotation</title>
  </head>
  <body>
	<form>
		<input type="radio" id="variable" name="annotation_type" value="variable">
		<label for="variable">Variable</label><br>
		<input type="radio" id="function" name="annotation_type" value="function">
		<label for="function">CSS</label><br>
		<input type="radio" id="lambda" name="annotation_type" value="lambda">
		<label for="lambda">Lambda</label><br>
		<label for="comment">Comment:</label><br>
  		<input type="text" id="comment" name="comment"><br>
		<input type="submit" value="Submit">
	</form>
  </body>
  </html>`;
}

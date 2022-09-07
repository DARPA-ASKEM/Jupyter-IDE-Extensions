// file annotater/annotater.js

function push_to_es(id, annotation) {

    //REQUEST TO ELASTICSEARCH

    const body = JSON.stringify({ "annotations": annotation });
    const url = 'http://localhost:9201/jupyter_annotations/_doc/' + id + '?pretty';

    const response = fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: body
    });

    console.log(response)

}

async function get_from_es(id) {

    const url = 'http://localhost:9201/jupyter_annotations/_doc/' + id + '?pretty';

    const response = await fetch(url)
        .then(response => response.json());
    const response_value = response;
    console.log("GET ES RESPONSE: ", response_value);
    const response_source = response_value._source;
    console.log("RESPONSE SOURCE: ", response_source);
    return response_source;

}

function create_annotation_iframe(annotation, iframeCell, id, cellID, notebook_container) {
    const iframe = document.createElement('iframe');
    const html = '<h3>Annotating</h3><p>' + annotation[cellID].text + '</p><textarea id="annotation_comment"></textarea><button type="button" id="annotation_submit">Annotate</button>';
    if (iframeCell.lastChild !== null)
        iframeCell.removeChild(iframeCell.lastChild);
    iframeCell.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
    iframe.onload = function () {
        const submit_button = iframe.contentWindow.document.getElementById('annotation_submit');
        submit_button.onclick = function () {
            commentText = iframe.contentWindow.document.getElementById('annotation_comment').value;
            annotation[cellID].comment = commentText;
            push_to_es(id, annotation);
            document.getElementById('annotationDiv').remove();
            setTimeout(function () { manually_trigger_annotation(notebook_container); }, 1000);
        };
    }
}

function manually_trigger_annotation(notebook_container) {
    // Dispatch an onchange event to update the annotation marker for this cell.
    const e = new Event("newAnn");
    notebook_container.dispatchEvent(e);
}

function add_annotation_marker(cellIndex, annotation) {

    if (!!document.getElementById('annotation_marker_div' + cellIndex)) {
        console.log("cell already has annotation marker.");
        return;
    }

    const all_cells_dom = document.querySelectorAll('.cell');

    // Sets annotation alert button
    console.log("inside annotation adder: ", cellIndex, "ANN: ", annotation)
    const target_cell = all_cells_dom[cellIndex];
    const marker_div = document.createElement('div');
    marker_div.setAttribute('id', 'annotation_marker_div' + cellIndex);
    const show_hide_button = document.createElement('button');
    show_hide_button.setAttribute('id', 'annotation_button' + cellIndex);
    show_hide_button.textContent = "!";
    show_hide_button.classList.add("annotation-button");
    show_hide_button.onclick = function () { show_hide_annotation(cellIndex); };
    marker_div.appendChild(show_hide_button);
    target_cell.appendChild(marker_div);
    console.log("Added button.");

    // Adds annotation info div (hidden initially)
    const info_div = document.createElement('pre');
    info_div.setAttribute('id', "annotation_info_div" + cellIndex);
    info_div.style.display = "none";
    const text = document.createTextNode("Previous Annotation: \n Target Text: \"" + annotation.text + "\"\nComment: \"" + annotation.comment + "\"\n");
    info_div.appendChild(text);
    target_cell.appendChild(info_div);
    console.log("Added info Div");


}

function show_hide_annotation(cellIndex) {
    var annotation_info_div = document.getElementById("annotation_info_div" + cellIndex);
    if (annotation_info_div.style.display === "none") {
        annotation_info_div.style.display = "block";
    } else {
        annotation_info_div.style.display = "none";
    }
}

async function load_previous_annotations(notebook, es_id) {

    //const es_response = await get_from_es(es_id);
    let es_data = await get_from_es(es_id); //await es_response._source;
    console.log("PREVIOUS ANN: ", es_data)

    // Get all selected cells
    cells = notebook.get_cells();
    console.log("ALL JUPYTER CELLS: ", cells);

    cells.forEach((cell, index) => {
        let cellID = cell.id;
        try {
            let annotations_data = es_data.annotations[cellID];
            if (typeof annotations_data !== 'undefined') {
                console.log("Adding annotation Marker.");
                add_annotation_marker(index, annotations_data);
            }
        } catch (error) {
            console.log("Skipped cell, no previous annotation found.");
        }

    });

}

define([
    'base/js/namespace'
], function (
    Jupyter
) {
    function load_ipython_extension() {

        // add css
        const link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = requirejs.toUrl("./annotater.css");
        document.getElementsByTagName("head")[0].appendChild(link);

        const notebook = Jupyter.notebook;
        const documentID = notebook.get_notebook_name();
        load_previous_annotations(notebook, documentID);

        const notebook_container = document.getElementById("notebook-container");
        notebook_container.addEventListener("newAnn", (e) => {
            let notebook_reloaded = Jupyter.notebook;
            load_previous_annotations(notebook_reloaded, documentID);
        }, false);

        const cellHandler = async function () {

            const notebook = Jupyter.notebook;

            // Cleanup
            try {
                document.getElementById('annotationDiv').remove();
            } catch {
                console.log("No prior annotation div found");
            }

            //GRAB SELECTED TEXT

            const cell = notebook.get_selected_cell();
            const cell_text = cell.get_text();
            console.log(
                "This is the notebook:",
                notebook,
                "This is the cell: ",
                cell,
                "This is the selected cell text:",
                cell_text,
            );
            let annotation = {};
            const es_data = await get_from_es(documentID);
            console.log("ES DATA ANNOTATIONS: ", es_data);
            if (typeof es_data !== 'undefined') {
                if (typeof es_data.annotations !== 'undefined') {
                    annotation = es_data.annotations;
                }
            }
            cellID = cell.id;
            annotation[cellID] = {
                text: cell_text
            };

            // Gets the selected code cell
            const selectedResult = document.querySelectorAll('.selected');
            const selectedCell = selectedResult[0];
            iframeCell = document.createElement('div');
            iframeCell.setAttribute('id', 'annotationDiv')
            selectedCell.appendChild(iframeCell);

            console.log("ANNOTATION BEFORE CREATION OF IFRAME: ", annotation)

            create_annotation_iframe(annotation, iframeCell, documentID, cellID, notebook_container);

        };

        const selectionHandler = async function () {

            // Cleanup
            try {
                document.getElementById('annotationDiv').remove();
            } catch {
                console.log("No prior annotation div found");
            }

            //GRAB SELECTED TEXT

            const notebook = Jupyter.notebook;

            const cell = notebook.get_selected_cell();
            let selectedText = window.getSelection().toString();
            if (selectedText.length == 0) {
                const cm = cell.code_mirror;
                selectedText = cm.getSelection();
            }
            console.log(
                "This is the selected text:",
                selectedText
            );

            let annotation = {};
            const es_data = await get_from_es(documentID);
            console.log("ES DATA ANNOTATIONS: ", es_data);
            if (typeof es_data !== 'undefined') {
                if (typeof es_data.annotations !== 'undefined') {
                    annotation = es_data.annotations;
                }
            }
            cellID = cell.id;
            annotation[cellID] = {
                text: selectedText
            };

            // Gets the selected code cell
            const selectedResult = document.querySelectorAll('.selected');
            const selectedCell = selectedResult[0];
            iframeCell = document.createElement('div');
            iframeCell.setAttribute('id', 'annotationDiv')
            selectedCell.appendChild(iframeCell);

            console.log("ANNOTATION BEFORE CREATION OF IFRAME: ", annotation)

            create_annotation_iframe(annotation, iframeCell, documentID, cellID, notebook_container);

        };

        const cellAction = {
            icon: 'fa-code', // font-awesome icon
            help: 'Annotate Cell',
            help_index: 'zz',
            handler: cellHandler
        };
        const selectionAction = {
            icon: 'fa-comment-o',
            help: 'Annotate Selection',
            help_index: 'zz',
            handler: selectionHandler
        };
        const prefix = 'annotater';
        const cell_action_name = 'annotate-cell';
        const selection_action_name = 'annotate-selection';

        const full_cell_action = Jupyter.actions.register(cellAction, cell_action_name, prefix);
        const full_selection_action = Jupyter.actions.register(selectionAction, selection_action_name, prefix);
        Jupyter.toolbar.add_buttons_group([full_cell_action]);
        Jupyter.toolbar.add_buttons_group([full_selection_action]);
    }

    return {
        load_ipython_extension: load_ipython_extension
    };
});
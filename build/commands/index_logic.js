"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieve_references = retrieve_references;
exports.changes_to_index = changes_to_index;
const changes_1 = require("../util/changes");
const object_library_1 = require("../util/object_library");
function retrieve_references(ancestor_commit) {
    const ancestor_tree = (0, changes_1.flatten_tree)((0, object_library_1.get_object)(ancestor_commit.tree_hash));
    let res = [];
    for (const [path, hash] of ancestor_tree) {
        res.push({
            reference_type: "file",
            hash: hash,
            reference_path: path,
            stage: 0
        });
    }
    return res;
}
function changes_to_index(current_changes, blob_stage) {
    let index_blobs = [];
    Object.keys(current_changes).forEach((property) => {
        const current_change_property = current_changes[property];
        for (const [entry_directory, entry_hash] of current_change_property) {
            index_blobs.push({
                reference_type: 'file',
                hash: entry_hash,
                reference_path: entry_directory,
                stage: blob_stage
            });
        }
    });
    return index_blobs;
}

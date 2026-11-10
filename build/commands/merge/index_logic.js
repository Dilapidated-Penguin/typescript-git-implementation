"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.index_logic = index_logic;
const changes_1 = require("../../util/changes");
function index_logic(path_directories) {
    const { hash_to_directory } = (0, changes_1.change_operations)(path_directories);
    return {
        retrieve_references: (ancestor_commit_hash) => {
            const ancestor_tree = hash_to_directory(ancestor_commit_hash);
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
        },
        changes_to_index: (current_changes, blob_stage) => {
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
        },
        changes_to_map: (current_changes, blob_stage) => {
            let reference_list = new Map();
            Object.keys(current_changes).forEach((property) => {
                const current_change_property = current_changes[property];
                for (const [entry_directory, entry_hash] of current_change_property) {
                    reference_list.set(entry_directory, {
                        reference_type: 'file',
                        hash: entry_hash,
                        reference_path: entry_directory,
                        stage: blob_stage
                    });
                }
            });
            return reference_list;
        },
        index_to_map: (index) => {
            const index_map = new Map();
            for (const entry of index) {
                index_map.set(entry.reference_path, entry);
            }
            return index_map;
        }
    };
}

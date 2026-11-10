"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tag = tag;
exports.list_tags = list_tags;
const path = __importStar(require("path"));
const fs_1 = __importDefault(require("fs"));
const object_library_1 = require("../util/object_library");
const command_1 = require("../command");
const branch_logic_1 = require("../util/branch_logic");
/**
 * associates an immutable tag with a commits hash
 * @param {string} tag_name - Name of the tag. To be a valid tag_name the string must also be a valid file name. ie. no spaces etc
 * @param {string} commit_to_tag The hash to associate the tag with.
 * @returns {string} message indicating success or failure
 */
function tag(tag_name, commit_to_tag, deleting_tag = false) {
    const { is_object } = (0, object_library_1.object_library)(this);
    const { get_HEAD_hash } = (0, branch_logic_1.branch_operations)(this);
    commit_to_tag = (commit_to_tag === undefined) ? get_HEAD_hash() : commit_to_tag;
    if (commit_to_tag === null) {
        throw new Error('Cannot tag with null commit hash');
    }
    if ((0, command_1.valid_file_name)(tag_name)) {
        throw new TypeError('Invalid tag name');
    }
    const tag_path = path.join(this.ref_tags_dir, tag_name);
    const tag_path_stats = fs_1.default.statSync(tag_path);
    if (!is_object(commit_to_tag)) {
        throw new Error(`${commit_to_tag} is not a known commit`);
    }
    if (deleting_tag) {
        if (!tag_path_stats.isFile()) {
            throw new Error(`tag: ${tag_name} does not exist. Cannot delete non-existent tag`);
        }
        fs_1.default.rmSync(tag_path);
        return `tag: ${tag_name} deleted`;
    }
    else {
        if (tag_path_stats.isFile()) {
            throw new Error(`tag: ${tag_name} already exists. Cannot create duplicate of immutable tag`);
        }
        fs_1.default.writeFileSync(tag_path, commit_to_tag);
        return `tag: ${tag_name} created`;
    }
}
/**
 * @returns {string[]} sorted list of tag names
 */
function list_tags() {
    const tags_dir = this.ref_tags_dir;
    const tag_files = fs_1.default.readdirSync(tags_dir);
    return tag_files.sort();
}

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
exports.branch = branch;
const path = __importStar(require("path"));
const fs_1 = __importDefault(require("fs"));
const colors_1 = __importDefault(require("colors"));
const command_1 = require("../command");
const branch_logic_1 = require("../util/branch_logic");
function branch(branch_name, branch_to_be_removed) {
    var _a;
    const { get_HEAD_branch, get_branch_hash, is_branch } = (0, branch_logic_1.branch_operations)(this);
    const branches = fs_1.default.readdirSync(this.ref_heads_dir);
    const head_branch = get_HEAD_branch();
    if (branch_name === undefined) {
        if (branches.length === 0) {
            return [colors_1.default.green(head_branch)];
        }
        else {
            branches.splice(branches.indexOf(head_branch), 1, colors_1.default.green(head_branch));
            return branches;
        }
    }
    if (branches.length === 0) {
        throw Error(`fatal: not a valid object name: 'main'`);
    }
    const branch_exists = is_branch(branch_name);
    const branch_path = path.join(this.ref_heads_dir, branch_name);
    if (branch_to_be_removed) {
        if ((branch_name === head_branch)) {
            throw Error('User cannot delete the branch currently checked out');
        }
        if (!branch_exists) {
            throw Error(`branch ${branch_name} does not exist`);
        }
        fs_1.default.rmSync(branch_path);
        return `${branch_name} has been deleted`;
    }
    else {
        if (!(0, command_1.valid_file_name)(branch_name)) {
            throw new TypeError(`${branch_name} is and invalid branch name`);
        }
        if (branch_exists) {
            throw new Error(`branch name: ${branch_name} already exists`);
        }
        fs_1.default.writeFileSync(branch_path, (_a = get_branch_hash(head_branch)) !== null && _a !== void 0 ? _a : ''); //creates new branch and point it to the current head commit
        return `${branch_name} created`;
    }
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = logger;
const colors_1 = __importDefault(require("colors"));
function logger(...message) {
    console.log(colors_1.default.green.bold(message.join('')));
}

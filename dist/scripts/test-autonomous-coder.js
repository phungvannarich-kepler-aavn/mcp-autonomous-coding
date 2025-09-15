#!/usr/bin/env ts-node
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.testAutonomousCoder = testAutonomousCoder;
// scripts/test-autonomous-coder.ts
const autonomous_coder_1 = require("./autonomous-coder");
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
async function testAutonomousCoder() {
    console.log('🧪 Testing Autonomous Coder...');
    // Verify environment variables
    if (!process.env.MCP_GITHUB_TOKEN && !process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
        console.error('❌ Missing GitHub token in environment variables');
        process.exit(1);
    }
    const coder = new autonomous_coder_1.AutonomousCoder();
    // Test request
    const testRequest = {
        repository: process.env.DEFAULT_REPO || 'phungvannarich-kepler-aavn/mcp-autonomous-coding',
        task: 'Create a simple hello world function in Python',
        priority: 'medium',
        requester: 'test-user'
    };
    try {
        console.log('🚀 Processing test request...');
        await coder.processRequest(testRequest);
        console.log('✅ Test completed successfully!');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}
// Run the test if this file is executed directly
if (require.main === module) {
    testAutonomousCoder().catch(console.error);
}
//# sourceMappingURL=test-autonomous-coder.js.map
#!/usr/bin/env node
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const issueKey = process.argv[2];
const filePath = process.argv[3];

if (!issueKey || !filePath) {
  console.error('Usage: node scripts/jira-attach.mjs <ISSUE_KEY> <FILE_PATH>');
  process.exit(1);
}

const email = process.env.ATLASSIAN_EMAIL || process.env.JIRA_LOGIN_EMAIL;
const token = process.env.ATLASSIAN_API_TOKEN;
const baseUrl = (process.env.ATLASSIAN_BASE_URL || 'https://legionqaschool.atlassian.net').replace(/\/$/, '');

if (!email || !token) {
  console.error('Missing ATLASSIAN_EMAIL/ATLASSIAN_API_TOKEN in .env');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const auth = Buffer.from(`${email}:${token}`).toString('base64');
const fileName = path.basename(filePath);
const fileBuffer = fs.readFileSync(filePath);
const boundary = `----jiraAttach${Date.now()}`;
const body = Buffer.concat([
  Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: image/png\r\n\r\n`,
  ),
  fileBuffer,
  Buffer.from(`\r\n--${boundary}--\r\n`),
]);

const response = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/attachments`, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${auth}`,
    'X-Atlassian-Token': 'no-check',
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  },
  body,
});

const text = await response.text();
if (!response.ok) {
  console.error(`Attachment failed (${response.status}): ${text}`);
  process.exit(1);
}

console.log(`Attached ${fileName} to ${issueKey}`);

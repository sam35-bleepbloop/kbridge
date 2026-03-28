import { readFileSync, writeFileSync } from 'fs';
const path = 'C:/Users/samcv/projects/kbridge/components/dashboard/index.tsx';
let content = readFileSync(path, 'utf8');

const anchor = `  {
    type:   "OTHER",
    label:  "Other / not sure",`;

const insertion = `  {
    type:   "SUPPORT",
    label:  "Get help / Support",
    desc:   "Account issues, stuck tasks, billing questions",
    tokens: "Always free",
    iconBg: "#E8F4FD",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5.5" stroke="#1A6FA8" strokeWidth="1.3"/>
        <path d="M6 6.5C6 5.4 6.9 4.5 8 4.5s2 .9 2 2c0 1-.7 1.5-1.3 1.9C8.3 8.7 8 9 8 9.5" stroke="#1A6FA8" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="8" cy="11.5" r="0.7" fill="#1A6FA8"/>
      </svg>
    ),
  },
  {
    type:   "OTHER",
    label:  "Other / not sure",`;

if (content.includes(anchor)) {
  writeFileSync(path, content.replace(anchor, insertion), 'utf8');
  console.log('SUCCESS');
} else {
  console.log('MATCH FAILED');
}
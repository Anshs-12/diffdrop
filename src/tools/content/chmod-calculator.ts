import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Chmod calculator',
  lede: 'Tick read, write and execute for the owner, the group and everyone else to get the octal mode (755) and the symbolic form (rwxr-xr-x), or type either one to fill in the boxes. Includes setuid, setgid and sticky.',
  steps: [
    { title: 'Set the permissions', body: 'Tick the boxes, pick a preset like 644 or 755, or type an octal or symbolic mode. Everything stays in sync.' },
    { title: 'Read what it means', body: 'A plain explanation says who can read, change or run the file, and what the special bits do.' },
    { title: 'Copy the command', body: 'Copy chmod 755 file or the symbolic chmod u=rwx,g=rx,o=rx file, with your file name filled in.' },
  ],
  faq: [
    { q: 'What do the digits in 755 mean?', a: 'One digit each for the owner, the group and others. Each is the sum of read (4), write (2) and execute (1): 7 is rwx, 5 is r-x, 4 is r--, 6 is rw-.' },
    { q: 'What’s the fourth digit in 4755 or 0755?', a: 'The special bits: 4 is setuid, 2 is setgid and 1 is sticky, added together. 0755 is the same as 755 with no special bits.' },
    { q: 'What do s, S, t and T mean in ls -l?', a: 'They take the execute spot. A lowercase s or t means the special bit and execute are both set; uppercase S or T means the special bit is set without execute, which usually has no useful effect.' },
    { q: 'Which permissions should I use?', a: 'Common choices are 644 for ordinary files, 755 for scripts and directories, and 600 or 700 for private files such as SSH keys. Avoid 777: it lets anyone on the system change the file.' },
  ],
  example: {
    intro: 'A script everyone can run but only the owner can edit.',
    inputLabel: 'octal',
    input: '755',
    outputLabel: 'symbolic',
    output: 'rwxr-xr-x\nchmod 755 deploy.sh\nchmod u=rwx,g=rx,o=rx deploy.sh',
  },
  mistakes: [
    { title: 'chmod 777 to fix an error', body: 'It makes the file writable by every user and process on the machine. Find out which user needs access and grant only that.' },
    { title: 'Directories without execute', body: 'A directory needs x to be entered. 644 on a directory lets you list names but not open the files inside.' },
    { title: 'Recursive chmod on mixed trees', body: 'chmod -R 755 makes every file executable. Use find with -type f and -type d to set files and directories separately.' },
    { title: 'Loose SSH key permissions', body: 'ssh refuses a private key that others can read. Keep keys at 600 and ~/.ssh at 700.' },
  ],
  related: ['subnet-calculator', 'number-base-converter', 'cron-generator', 'hash-generator'],
};

export default content;

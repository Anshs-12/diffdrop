import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Cron expression generator',
  lede: 'Build a cron schedule from presets or field by field, or paste one to read it in plain English. The next run times are listed in your own time zone.',
  steps: [
    { title: 'Start from a preset or paste', body: 'Pick a preset like Weekdays at 09:00, or paste any five-field expression. A six-field form with seconds first and shortcuts like @daily also work.' },
    { title: 'Adjust each field', body: 'Edit minute, hour, day of month, month and day of week separately. Lists (1,15), ranges (1-5), steps (*/10) and names (JAN, MON) are all supported.' },
    { title: 'Check the next runs', body: 'The explanation and the upcoming run times update as you type. Errors name the field and say what’s wrong.' },
  ],
  faq: [
    { q: 'What do the five fields mean?', a: 'In order: minute (0–59), hour (0–23), day of month (1–31), month (1–12 or JAN–DEC) and day of week (0–7 or SUN–SAT, where both 0 and 7 are Sunday). 0 9 * * 1-5 means 09:00 on weekdays.' },
    { q: 'What happens when I set both day of month and day of week?', a: 'The job runs when either matches. 0 0 1 * MON runs on the 1st of every month and also every Monday. This catches many people out; if either field is *, only the other one counts.' },
    { q: 'Which time zone does cron use?', a: 'The time zone of the machine or service running it, often UTC on servers and cloud schedulers. The run times here are shown in your browser’s time zone, so convert if your server uses another.' },
    { q: 'What about daylight saving time?', a: 'Here, a run time that doesn’t exist when clocks go forward is skipped, and a time that happens twice when clocks go back is listed once. Real cron daemons differ in how they handle these hours, so avoid scheduling important jobs between 01:00 and 03:00 local time.' },
    { q: 'Are L, W and # supported?', a: 'No. Those are Quartz and some cloud scheduler extensions, not standard cron. Quartz’s seven-field form with a year isn’t supported either.' },
  ],
  example: {
    intro: 'Every 15 minutes during office hours, on weekdays.',
    inputLabel: 'cron',
    input: '*/15 9-17 * * MON-FRI',
    outputLabel: 'meaning',
    output: 'Every 15 minutes, between 09:00 and 17:59, Monday through Friday',
  },
  mistakes: [
    { title: 'Writing * in the minute field', body: '* 9 * * * runs every minute from 09:00 to 09:59, sixty times. For once at 09:00, write 0 9 * * *.' },
    { title: 'Expecting day of month AND day of week', body: 'When both are set, cron runs on either. To run only on the first Monday, set the days 1-7 and check the weekday inside your script.' },
    { title: 'Forgetting the server’s time zone', body: 'A job set for 09:00 on a UTC server runs at 09:00 UTC, which may be the middle of the night where you are.' },
    { title: 'Assuming */7 means every seven days', body: 'In the day-of-month field, */7 means days 1, 8, 15, 22 and 29, restarting each month. The gap from the 29th to the next 1st is shorter.' },
  ],
  related: ['unix-timestamp', 'regex-tester', 'chmod-calculator', 'http-status'],
};

export default content;

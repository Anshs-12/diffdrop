import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Number base converter',
  lede: 'Type a number in binary, octal, decimal, hex or any base from 2 to 36, and see it in all the others at once. Integers of any size stay exact.',
  steps: [
    { title: 'Type in any field', body: 'Binary, octal, decimal, hexadecimal, or the custom base. The other fields update as you type.' },
    { title: 'Use the notation you have', body: 'Prefixes like 0x, 0b and 0o, a minus sign, and underscores or spaces between digits are all accepted. An invalid digit is named, with its position.' },
    { title: 'Copy the result', body: 'Each field has a copy button. Turn on Group digits to read long binary in groups of 4 and hex in pairs.' },
  ],
  faq: [
    { q: 'How do I convert binary to decimal by hand?', a: 'Multiply each digit by 2 raised to its position, counting from 0 on the right, and add them up: 1011 is 8 + 0 + 2 + 1 = 11.' },
    { q: 'Why does each hex digit match four binary digits?', a: 'Because 16 is 2⁴. That makes hex a compact way to write binary: 1111 0000 is F0, and a byte is always two hex digits.' },
    { q: 'Is there a size limit?', a: 'No practical one. The converter uses JavaScript BigInt, so a 1,000-digit number converts exactly, unlike calculators that round after about 16 digits.' },
    { q: 'How are negative numbers shown?', a: 'With a minus sign in every base: -255 is -ff in hex. The converter doesn’t show two’s complement, because that depends on a fixed bit width.' },
    { q: 'Can it convert fractions?', a: 'No, only whole numbers. Fractions often have no exact form in another base: 0.1 in decimal repeats forever in binary.' },
  ],
  example: {
    intro: 'The largest unsigned 64-bit integer, 2⁶⁴ − 1, written in decimal, hex and base 36.',
    inputLabel: 'decimal',
    input: '18446744073709551615',
    outputLabel: 'hex · base 36',
    output: 'FFFFFFFFFFFFFFFF\n3W5E11264SGSF',
  },
  mistakes: [
    { title: 'Leaving a 0x prefix in a decimal field', body: '0x10 is 16, not 10. The converter tells you when a prefix doesn’t match the field you typed in.' },
    { title: 'Reading 010 as ten', body: 'In some languages a leading 0 means octal, so 010 is 8. Here, leading zeros are ignored in every field, and octal is only octal in the octal field.' },
    { title: 'Trusting a spreadsheet with big numbers', body: 'Spreadsheets and JavaScript numbers keep about 15–17 significant digits, so 64-bit IDs get rounded. This converter is exact at any length.' },
    { title: 'Mixing up the letter O and zero', body: 'In bases above 24, O is a digit worth 24. Check the error message if a value looks wrong.' },
  ],
  related: ['chmod-calculator', 'subnet-calculator', 'color-converter', 'unix-timestamp'],
};

export default content;

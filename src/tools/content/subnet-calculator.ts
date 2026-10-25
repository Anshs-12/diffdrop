import type { ToolContent } from '../content';

const content: ToolContent = {
  h1: 'Subnet calculator',
  lede: 'Enter an IPv4 address in CIDR form (192.168.1.10/24) or with a subnet mask to get its network and broadcast address, host range, host count and masks, in decimal and binary. IPv4 only; runs in your browser.',
  steps: [
    { title: 'Enter an address', body: 'Type 10.0.0.5/20, or an address and a mask like 10.0.0.5 255.255.240.0. A bare address is taken as /32.' },
    { title: 'Read the subnet', body: 'You get the network, broadcast, first and last usable host, total and usable addresses, the wildcard mask, and whether the address is private, public or in a special range.' },
    { title: 'Split it if you need to', body: 'Choose a longer prefix, or how many subnets you need, to list the smaller networks inside it with their ranges.' },
  ],
  faq: [
    { q: 'Why are there two fewer usable hosts than addresses?', a: 'In a normal subnet the first address names the network and the last is the broadcast address, so neither is given to a host. A /24 has 256 addresses and 254 usable hosts.' },
    { q: 'What about /31 and /32?', a: 'A /31 has just two addresses and no network or broadcast address, so both are usable on a point-to-point link (RFC 3021). A /32 is a single address, used for one host or a route to it.' },
    { q: 'What is a wildcard mask?', a: 'The subnet mask with every bit flipped: 255.255.255.0 becomes 0.0.0.255. Cisco access lists and OSPF use it to say which bits can vary.' },
    { q: 'Which addresses are private?', a: '10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16 (RFC 1918). 100.64.0.0/10 is shared space for carrier-grade NAT, 169.254.0.0/16 is link-local, and 127.0.0.0/8 is loopback; none of these is routed on the public internet.' },
    { q: 'Does it support IPv6?', a: 'Not yet. It handles IPv4 only.' },
  ],
  example: {
    intro: 'An office network written as an address with its prefix.',
    inputLabel: 'input',
    input: '172.20.37.9/20',
    outputLabel: 'subnet',
    output:
      'Address:          172.20.37.9/20\nNetwork:          172.20.32.0\nBroadcast:        172.20.47.255\nSubnet mask:      255.255.240.0\nWildcard mask:    0.0.15.255\nFirst host:       172.20.32.1\nLast host:        172.20.47.254\nTotal addresses:  4,096\nUsable hosts:     4,094\nClass (historic): B\nRange:            Private (RFC 1918)\n',
    note: 'A /20 ends inside the third byte, so the network starts at 172.20.32.0, not 172.20.37.0.',
  },
  mistakes: [
    { title: 'Masks that aren’t contiguous', body: '255.0.255.0 isn’t a valid subnet mask: all the 1 bits must come first. Each mask matches exactly one prefix length.' },
    { title: 'Assuming the network starts at .0', body: 'Only on byte-aligned prefixes like /24. 10.1.5.9/22 belongs to 10.1.4.0, not 10.1.5.0.' },
    { title: 'Giving a host the network or broadcast address', body: 'On /30 and larger subnets, the first and last addresses aren’t usable host addresses.' },
    { title: 'Relying on address classes', body: 'Classes A, B and C were replaced by CIDR in 1993. A 10.x address isn’t automatically a /8; the prefix length decides.' },
  ],
  related: ['number-base-converter', 'chmod-calculator', 'http-status', 'unix-timestamp'],
};

export default content;

export const SAMPLE_ORIGINAL = `import { formatPrice } from './utils';

const TAX_RATE = 0.08;

export function calculateTotal(items) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total + total * TAX_RATE;
}

export function renderCart(items) {
  const total = calculateTotal(items);
  console.log('Rendering cart');
  return \`Total: \${formatPrice(total)}\`;
}
`;

export const SAMPLE_CHANGED = `import { formatPrice } from './utils';

const TAX_RATE = 0.0825;
const FREE_SHIPPING_THRESHOLD = 50;

export function calculateTotal(items, coupon) {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * item.quantity;
  }
  const discount = coupon ? subtotal * coupon.percent : 0;
  return (subtotal - discount) * (1 + TAX_RATE);
}

export function renderCart(items, coupon) {
  const total = calculateTotal(items, coupon);
  const shipping = total >= FREE_SHIPPING_THRESHOLD ? 'Free' : '$4.99';
  return \`Total: \${formatPrice(total)} · Shipping: \${shipping}\`;
}
`;

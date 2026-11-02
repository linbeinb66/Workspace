import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

// 全站主题只在这里定义，组件不重复写品牌色。
const light = {
  brand: '#6E9A6E', 'brand-strong': '#426B4A', 'brand-soft': '#E8F0E4',
  canvas: '#F5F7F2', surface: '#FFFFFF', ink: '#2E3A2E', muted: '#6B7A6B',
  line: '#E3E9DF', danger: '#AF4242', 'danger-soft': '#FFF0ED',
  amber: '#805B20', 'amber-soft': '#FAF1DE', 'on-brand': '#102B15',
};
const dark: typeof light = {
  brand: '#98BC91', 'brand-strong': '#B0D0A7', 'brand-soft': '#283B2C',
  canvas: '#141C17', surface: '#1D2821', ink: '#E8EFE5', muted: '#A7B5A7',
  line: '#344237', danger: '#FFA79B', 'danger-soft': '#3C2726',
  amber: '#E3BF7F', 'amber-soft': '#3B3223', 'on-brand': '#102B15',
};
const palettes = {
  ocean: { light: {...light,brand:'#6B9EB0','brand-strong':'#365E72','brand-soft':'#E2EEF4',canvas:'#F2F6F8',line:'#DCE6EB'}, dark:{...dark,brand:'#8EBCCC','brand-strong':'#AED7E5','brand-soft':'#243B47',canvas:'#131D25',surface:'#1C2B35',line:'#334955'} },
  lavender: { light: {...light,brand:'#A18AB8','brand-strong':'#69517F','brand-soft':'#EEE7F5',canvas:'#F7F4FA',line:'#E6DFF0'}, dark:{...dark,brand:'#BDACD1','brand-strong':'#D7C7E8','brand-soft':'#382D45',canvas:'#1D1824',surface:'#2A2233',line:'#4A3C59'} },
  sunset: { light: {...light,brand:'#C89577','brand-strong':'#88583E','brand-soft':'#F7E7DA',canvas:'#FCF7F1',line:'#EEDFD3'}, dark:{...dark,brand:'#DBAF92','brand-strong':'#EFCAB0','brand-soft':'#453127',canvas:'#241B17',surface:'#342720',line:'#554034'} },
};
const variables = (colors: typeof light) => Object.fromEntries(
  Object.entries(colors).map(([name, hex]) => [
    `--color-${name}`,
    [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(' '),
  ]),
);

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: Object.fromEntries(Object.keys(light).map((key) => [key, `rgb(var(--color-${key}) / <alpha-value>)`])),
      fontFamily: { sans: ['system-ui', '-apple-system', '"PingFang SC"', 'sans-serif'] },
      fontSize: { title: ['18px', { lineHeight: '1.5', fontWeight: '600' }], body: ['14px', '1.7'], caption: ['12px', '1.6'] },
      borderRadius: { card: '16px', btn: '12px', pill: '999px' },
      boxShadow: { card: '0 2px 8px rgba(0,0,0,.04)',glass:'0 10px 32px rgb(0 0 0 / .10), inset 0 1px 0 rgb(255 255 255 / .28)' },
    },
  },
  plugins: [plugin(({ addBase }) => addBase({ ':root': variables(light), '.dark': variables(dark),
    ...Object.fromEntries(Object.entries(palettes).flatMap(([name,colors])=>[[`:root[data-palette="${name}"]`,variables(colors.light)],[`:root.dark[data-palette="${name}"]`,variables(colors.dark)]])),
    ...Object.fromEntries(Object.entries({forest:{light,dark},...palettes}).map(([name,colors])=>[`.${name}-swatch`,{'--swatch-light':colors.light['brand-soft'],'--swatch-dark':colors.light.brand}])),
  }))],
} satisfies Config;

const config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        jersey: ['var(--font-jersey)'],
        geist: ['var(--font-geist-sans)'],
        geistMono: ['var(--font-geist-mono)'],
      },
    },
  },
  plugins: [],
};
export default config;

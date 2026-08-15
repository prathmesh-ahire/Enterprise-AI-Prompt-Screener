import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 44.5: fonts are npm packages bundled at build time, never a CDN link. This project's
// central claim is that it runs with no internet, so a Google Fonts <link> would break
// offline operation outright. Only the weights actually used are imported.
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './ThemeContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)

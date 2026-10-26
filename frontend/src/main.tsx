import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// fonts are npm packages bundled at build time, never a CDN link. This project's
// central claim is that it runs with no internet, so a Google Fonts <link> would break
// offline operation outright. Only the weights actually used are imported.
// the same five faces as the design (Inter 500/600/700, Source Sans 3 400/600),
// Latin subset only, as the design specifies. Self-hosted: no request leaves
// the page for a font.
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import './index.css'
// The component library. Imported after index.css on purpose - index.css owns the
// tokens and base typography, this owns every component's appearance, and later-wins
// ordering means a component rule never has to fight the base with extra specificity.
import './styles/components.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

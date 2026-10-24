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
// 45: the component library. Imported after index.css on purpose - index.css owns the
// tokens and base typography, this owns every component's appearance, and later-wins
// ordering means a component rule never has to fight the base with extra specificity.
import './styles/components.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

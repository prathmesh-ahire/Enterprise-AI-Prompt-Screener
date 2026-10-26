// A section's eyebrow, title and one lead sentence. The same markup serves both moods: inside
// .ps-public the title takes the display-section size with a short glow line under the
// header, and in the app it is a plain h2. The eyebrow is two to four words, the lead is one
// sentence capped at the reading width, and `id` is the anchor the table of contents links to.
interface SectionHeaderProps {
  eyebrow: string
  title: string
  lead?: string
  id?: string
}

export function SectionHeader({ eyebrow, title, lead, id }: SectionHeaderProps) {
  return (
    <header className="ps-section-head" id={id}>
      <span className="ps-eyebrow">{eyebrow}</span>
      <h2 className="ps-section-head__title">{title}</h2>
      {lead && <p className="ps-section-head__text">{lead}</p>}
    </header>
  )
}

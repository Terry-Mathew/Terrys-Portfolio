# Certifications Section - Content & Structure

## Overview
The Certifications section displays 8 professional certifications in a clean, card-based layout. Each certification includes the name, issuer, year, logo, and a verification URL.

## Data Structure (from Home.tsx lines 264-273)

```typescript
const certifications = [
  {
    name: 'OCI 2025 — Certified Generative AI Professional',
    year: '2025',
    issuer: 'Oracle',
    logo: '/oracle.png',
    url: 'https://catalog-education.oracle.com/ords/certview/sharebadge?id=03D675A81A08EFCE32B289138E5AFAD55C43E7E5BB0520ACBC150CC03CB350FF'
  },
  {
    name: 'Oracle Fusion AI Agent Studio — Foundations Associate',
    year: '2025',
    issuer: 'Oracle',
    logo: '/oracle.png',
    url: 'https://catalog-education.oracle.com/ords/certview/sharebadge?id=6C58CE6EBB603C223306F8261F4AE4E24AEBD4F6073C85F5E6FC9A48DC4E3D8C'
  },
  {
    name: 'OCI 2025 — AI Foundations Associate',
    year: '2025',
    issuer: 'Oracle',
    logo: '/oracle.png',
    url: 'https://catalog-education.oracle.com/ords/certview/sharebadge?id=38D8D33A0BF3B0859364C86B3B0AE63434BC4B24ADC9E5FCBF02284665BC5898'
  },
  {
    name: 'Oracle APEX Cloud Certified Developer Professional',
    year: '2024',
    issuer: 'Oracle',
    logo: '/oracle.png',
    url: 'https://catalog-education.oracle.com/ords/certview/sharebadge?id=9E5A56C1FB2B670C15AFDEA8708FF7C143C7352F06103EB70ABA69485BAA8BEB'
  },
  {
    name: 'AI Engineer Agentic Track — Complete Agent & MCP Course',
    year: '2025',
    issuer: 'Udemy',
    logo: '/Udemy New.png',
    url: 'https://www.udemy.com/certificate/UC-21ca774d-ebfb-4f8a-ac34-d40608e14ce7/'
  },
  {
    name: 'Introduction to Generative AI',
    year: '2024',
    issuer: 'Google Cloud',
    logo: '/google.png',
    url: 'https://www.coursera.org/account/accomplishments/verify/L8DDJ4YCMC74'
  },
  {
    name: 'Introduction to Responsible AI',
    year: '2024',
    issuer: 'Google Cloud',
    logo: '/google.png',
    url: 'https://www.coursera.org/account/accomplishments/verify/MTXKBRJ6LE79'
  },
  {
    name: 'Digital Skills: User Experience',
    year: '2024',
    issuer: 'Accenture',
    logo: '/accenture.png',
    url: 'https://www.futurelearn.com/certificates/ai3kc12'
  }
];
```

## UI Structure (Home.tsx lines 576-610)

```tsx
<section className="section-padding bg-[var(--color-surface)] reveal-section">
  <div className="container-narrow">
    <div className="text-label mb-4">CERTIFICATIONS</div>
    <div className="divider divider-accent mb-10" />

    <div className="certs-grid space-y-2">
      {certifications.map((cert, index) => (
        <a
          key={index}
          href={cert.url}
          target="_blank"
          rel="noopener noreferrer"
          className="cert-card group flex items-center gap-4 py-4 px-1 border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-bg-alt)]/50 transition-colors rounded-sm cursor-pointer"
        >
          {/* Logo */}
          <div className="w-10 h-10 rounded-full bg-[var(--color-bg)] flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img
              src={cert.logo}
              alt={cert.issuer}
              className="w-6 h-6 object-contain opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>

          {/* Name & Issuer */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[var(--color-text)] text-sm leading-snug group-hover:text-[var(--color-accent)] transition-colors">
              {cert.name}
            </p>
            <p className="text-caption text-xs mt-0.5">{cert.issuer}</p>
          </div>

          {/* Year & Arrow */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-mono text-xs text-[var(--color-text-muted)]">{cert.year}</span>
            <ArrowUpRight className="w-4 h-4 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </a>
      ))}
    </div>
  </div>
</section>
```

## Animation (GSAP - Home.tsx lines 139-153)

```javascript
// Cert cards stagger
gsap.fromTo('.cert-card',
  { opacity: 0, y: 20 },
  {
    opacity: 1,
    y: 0,
    duration: 0.4,
    stagger: 0.06,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.certs-grid',
      start: 'top 85%',
    }
  }
);
```

## Styling Notes

- **Container**: `container-narrow` (max-width ~800px)
- **Background**: `bg-[var(--color-surface)]` (darker than main bg)
- **Card**: Horizontal flex layout with logo on left, details center, year/arrow right
- **Hover**: Background highlight + accent color on name + arrow reveal
- **Icons**: ArrowUpRight appears on hover (opacity 0 → 100)
- **Logos**: Stored in `/public/` folder (oracle.png, google.png, Udemy New.png, accenture.png)

## Migration Checklist

- [ ] Copy certification data array
- [ ] Copy logo assets from `/public/`
- [ ] Recreate card component with same hover states
- [ ] Apply GSAP stagger animation
- [ ] Ensure external links open in new tab with `rel="noopener noreferrer"`
- [ ] Verify all verification URLs still work
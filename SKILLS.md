# Skills Section - Content & Structure

## Overview
The Skills section displays 4 skill categories with 31 individual skills in a tag-based layout. Each category has a colored accent bar and a list of skills as styled pills.

## Data Structure (from Home.tsx lines 275-314)

```typescript
const skills = {
  'Product Management': [
    'Product Strategy',
    'Roadmapping',
    'Cross-Functional Leadership',
    'Agile / Scrum',
    'User Research',
    'Stakeholder Communication',
    'Go-to-Market Planning',
    'A/B Testing'
  ],
  'Data & Analytics': [
    'SQL',
    'Python',
    'Power BI',
    'Oracle Analytics Cloud',
    'Data Pipelines',
    'KPI Definition',
    'Data-Driven Decisions'
  ],
  'AI Expertise': [
    'Prompt Engineering',
    'RAG Architecture',
    'Multi-Agent Systems',
    'ML Fundamentals',
    'Vector Databases',
    'AI Ethics & Bias'
  ],
  'AI Development': [
    'Cursor',
    'Replit',
    'Lovable.dev',
    'Bolt.new',
    'LangChain',
    'CrewAI',
    'n8n',
    'Supabase',
    'Vercel'
  ]
};
```

## UI Structure (Home.tsx lines 612-639)

```tsx
<section id="skills" className="section-padding reveal-section">
  <div className="container-narrow">
    <div className="text-label mb-4">SKILLS</div>
    <div className="divider divider-accent mb-10" />

    <div className="skills-grid grid md:grid-cols-2 gap-5">
      {Object.entries(skills).map(([category, skillList], catIndex) => (
        <div key={catIndex} className="skill-category group">
          {/* Category Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-[var(--color-accent)] rounded-full" />
            <h3 className="font-semibold text-[var(--color-text)] text-base">{category}</h3>
          </div>

          {/* Skill Tags */}
          <div className="flex flex-wrap gap-2 pl-4">
            {skillList.map((skill, skillIndex) => (
              <span
                key={skillIndex}
                className="inline-flex items-center px-3 py-1.5 bg-[var(--color-bg-alt)] text-[var(--color-text-secondary)] text-sm rounded-md border border-transparent hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)] transition-all cursor-default"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
```

## Animation (GSAP - Home.tsx lines 155-169)

```javascript
// Skill categories stagger
gsap.fromTo('.skill-category',
  { opacity: 0, y: 30 },
  {
    opacity: 1,
    y: 0,
    duration: 0.5,
    stagger: 0.1,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.skills-grid',
      start: 'top 85%',
    }
  }
);
```

## Styling Notes

- **Grid**: 2 columns on md+, 1 column on mobile
- **Category Header**: 1px wide accent bar (`w-1 h-5`) + category name
- **Skill Tags**: Pill-shaped with `bg-[var(--color-bg-alt)]`, subtle hover effect
- **Padding**: `pl-4` on skill list aligns with accent bar
- **Cursor**: `cursor-default` (not interactive, just display)

## Skill Count Summary

| Category | Count |
|----------|-------|
| Product Management | 8 |
| Data & Analytics | 7 |
| AI Expertise | 6 |
| AI Development | 9 |
| **Total** | **30** |

## Migration Checklist

- [ ] Copy skills object with all 4 categories and 30 skills
- [ ] Recreate grid layout (2-col md, 1-col mobile)
- [ ] Style category header with accent bar
- [ ] Style skill pills with hover states
- [ ] Apply GSAP stagger animation per category
- [ ] Ensure responsive behavior matches
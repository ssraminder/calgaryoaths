export interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    title: 'How to write an affidavit in Alberta (2025 guide)',
    slug: 'how-to-write-an-affidavit-alberta',
    excerpt: 'A step-by-step guide to drafting a legally valid affidavit in Alberta — what to include, what to avoid, and how commissioning works.',
    category: 'Affidavits',
    date: '2025-01-15',
    readTime: '6 min read',
    content: 'Full article coming soon.',
  },
  {
    title: 'What is a Commissioner of Oaths in Calgary?',
    slug: 'what-is-a-commissioner-of-oaths-calgary',
    excerpt: 'Everything you need to know about what a Commissioner of Oaths does, who can become one, and when you need their services.',
    category: 'General',
    date: '2025-01-20',
    readTime: '5 min read',
    content: 'Full article coming soon.',
  },
  {
    title: 'Travel consent letter for Canada — what parents need to know',
    slug: 'travel-consent-letter-canada-guide',
    excerpt: 'Planning to travel with your child without the other parent? Here is exactly what the CBSA and airlines expect from a travel consent letter.',
    category: 'Travel',
    date: '2025-02-01',
    readTime: '7 min read',
    content: 'Full article coming soon.',
  },
  {
    title: "Statutory declaration vs affidavit — what's the difference?",
    slug: 'statutory-declaration-vs-affidavit',
    excerpt: 'Two common documents that often get confused. Learn when to use a statutory declaration versus an affidavit in Alberta.',
    category: 'General',
    date: '2025-02-10',
    readTime: '4 min read',
    content: 'Full article coming soon.',
  },
  {
    title: 'IRCC invitation letter — requirements and format (2025)',
    slug: 'ircc-invitation-letter-requirements-2025',
    excerpt: 'Inviting a family member or friend to Canada? This guide covers exactly what your invitation letter needs to include for a successful visitor visa application.',
    category: 'Immigration',
    date: '2025-02-20',
    readTime: '8 min read',
    content: 'Full article coming soon.',
  },
  {
    title: 'Common law declaration in Alberta — step by step',
    slug: 'common-law-declaration-alberta',
    excerpt: 'Proving a common-law relationship for tax, benefits, or immigration purposes requires a statutory declaration. Here is what the process looks like.',
    category: 'Declarations',
    date: '2025-03-01',
    readTime: '5 min read',
    content: 'Full article coming soon.',
  },
  {
    title: 'Apostille in Canada — what changed in 2024?',
    slug: 'apostille-canada-2024-changes',
    excerpt: 'Canada joined the Hague Apostille Convention in January 2024. Here is what that means for Canadians who need documents authenticated for international use.',
    category: 'Apostille',
    date: '2025-03-10',
    readTime: '6 min read',
    content: 'Full article coming soon.',
  },
  {
    title: 'Commissioner of Oaths vs Notary Public in Alberta',
    slug: 'commissioner-of-oaths-vs-notary-public-alberta',
    excerpt: 'Not sure which professional you need? This guide breaks down the key differences and helps you choose the right service for your documents.',
    category: 'General',
    date: '2025-03-20',
    readTime: '5 min read',
    content: 'Full article coming soon.',
  },
];

export const blogCategories = [...new Set(blogPosts.map((p) => p.category))];

/**
 * portfolioSections.ts
 * Central config for portfolio type → sections mapping.
 * Each type gets a completely different section set based on user purpose.
 */

import type { LucideIcon } from 'lucide-react';
import {
  User, GraduationCap, Briefcase, Award, BookOpen, FolderOpen, Star,
  CreditCard, Target, Globe, DollarSign, MoreHorizontal, FileText,
  BookMarked, Camera, Phone, Layers,
} from 'lucide-react';

/* ─── public types ──────────────────────────────────────────────────────── */

export interface SectionConfig {
  title: string;
  kind: 'text' | 'list' | 'vault';
  placeholder?: string;
  icon: LucideIcon;
  color: string;
  hint?: string;
  /** Vault sections only — document types expected here (shown as chips + used for smart filtering) */
  expectedDocs?: string[];
  /** Keywords used to smart-match vault documents by name */
  matchKeywords?: string[];
}

export interface TypeMeta {
  label: string;
  icon: LucideIcon;
  gradient: string;
  glow: string;
  border: string;
  tagline: string;
  description: string;
}

/* ─── type meta ─────────────────────────────────────────────────────────── */

export const TYPE_META: Record<string, TypeMeta> = {
  personal: {
    label:       'Personal Portfolio',
    icon:        User,
    gradient:    'linear-gradient(135deg,#06b6d4,#3b82f6)',
    glow:        'rgba(6,182,212,0.30)',
    border:      'rgba(6,182,212,0.40)',
    tagline:     'Showcase skills, projects & identity',
    description: 'Personal profile, skills, projects & basic documents',
  },
  academic: {
    label:       'Academic Portfolio',
    icon:        GraduationCap,
    gradient:    'linear-gradient(135deg,#8b5cf6,#ec4899)',
    glow:        'rgba(139,92,246,0.30)',
    border:      'rgba(139,92,246,0.45)',
    tagline:     'Full academic document package',
    description: 'Complete academic + entrance exam + financial document pack',
  },
  professional: {
    label:       'Professional / Placement Portfolio',
    icon:        Briefcase,
    gradient:    'linear-gradient(135deg,#10b981,#14b8a6)',
    glow:        'rgba(16,185,129,0.30)',
    border:      'rgba(16,185,129,0.40)',
    tagline:     'Career, placement & hiring ready',
    description: 'Resume, work experience, projects & career documents',
  },
  masters: {
    label:       'Masters Portfolio',
    icon:        Award,
    gradient:    'linear-gradient(135deg,#f59e0b,#ef4444)',
    glow:        'rgba(245,158,11,0.30)',
    border:      'rgba(245,158,11,0.40)',
    tagline:     'MS / PhD application document pack',
    description: 'Research, publications + full academic + language test docs',
  },
};

/* ─── section configs per type ──────────────────────────────────────────── */

export const SECTIONS_BY_TYPE: Record<string, SectionConfig[]> = {

  /* ══════════════════════════════════════════════════════════════════════
     PERSONAL PORTFOLIO
     Focus: personal profile only. NO academic exams, financial, or internship docs.
  ══════════════════════════════════════════════════════════════════════ */
  personal: [
    {
      title:       'About Me',
      kind:        'text',
      placeholder: 'Write a short intro – who you are, what you love doing…',
      icon:        User,
      color:       '#38bdf8',
      hint:        'Personal introduction & bio',
    },
    {
      title:       'Skills',
      kind:        'list',
      placeholder: 'Add a skill (e.g. Graphic Design, Python, Photography…)',
      icon:        Star,
      color:       '#a78bfa',
      hint:        'Technical & soft skills',
    },
    {
      title:       'Projects',
      kind:        'list',
      placeholder: 'Project name · what it does · your role…',
      icon:        FolderOpen,
      color:       '#34d399',
      hint:        'Personal or creative projects',
    },
    {
      title:       'Achievements',
      kind:        'list',
      placeholder: 'Add an achievement, award, or milestone…',
      icon:        Award,
      color:       '#fbbf24',
      hint:        'Honours, competitions, milestones',
    },
    {
      title:       'Certifications',
      kind:        'list',
      placeholder: 'e.g. Google UX Design, AWS Cloud Practitioner…',
      icon:        BookMarked,
      color:       '#f472b6',
      hint:        'Basic courses & certificates',
    },
    {
      title:       'Contact Info',
      kind:        'text',
      placeholder: 'Email, phone, LinkedIn URL, GitHub, portfolio website…',
      icon:        Phone,
      color:       '#60a5fa',
      hint:        'Links & contact details',
    },
    {
      title:        'Resume',
      kind:         'vault',
      icon:         FileText,
      color:        '#fb923c',
      hint:         'Attach your CV or resume from Vault',
      expectedDocs: ['Resume', 'CV', 'Curriculum Vitae'],
      matchKeywords: ['resume', 'cv', 'curriculum'],
    },
    {
      title:        'Personal Documents',
      kind:         'vault',
      icon:         CreditCard,
      color:        '#818cf8',
      hint:         'Optional – ID proof or basic supporting files',
      expectedDocs: ['Photo ID', 'Aadhaar Card', 'Passport'],
      matchKeywords: ['aadhaar', 'passport', 'id', 'photo id', 'identity'],
    },
  ],

  /* ══════════════════════════════════════════════════════════════════════
     PROFESSIONAL / PLACEMENT PORTFOLIO
     Focus: resume, experience, projects, work docs.
     NO: GRE/GMAT/IELTS, financial docs, SOP/LOR, academic entrance sections.
  ══════════════════════════════════════════════════════════════════════ */
  professional: [
    {
      title:       'Professional Summary',
      kind:        'text',
      placeholder: 'Write a crisp professional summary (2-3 sentences)…',
      icon:        User,
      color:       '#38bdf8',
      hint:        'Elevator pitch for recruiters',
    },
    {
      title:       'Skills',
      kind:        'list',
      placeholder: 'Add a skill (e.g. React, Java, Data Analysis, Leadership…)',
      icon:        Star,
      color:       '#a78bfa',
      hint:        'Technical & transferable skills',
    },
    {
      title:       'Work Experience',
      kind:        'list',
      placeholder: 'Company · Role · Duration · Key accomplishments…',
      icon:        Briefcase,
      color:       '#34d399',
      hint:        'Jobs, internships, freelance work',
    },
    {
      title:       'Projects',
      kind:        'list',
      placeholder: 'Project name · tech stack · outcome · GitHub link…',
      icon:        FolderOpen,
      color:       '#fbbf24',
      hint:        'Technical or design projects',
    },
    {
      title:       'Achievements',
      kind:        'list',
      placeholder: 'Award, rank, competition result…',
      icon:        Award,
      color:       '#fb923c',
      hint:        'Awards, recognitions, rankings',
    },
    {
      title:       'Education',
      kind:        'list',
      placeholder: 'Degree · College · Year · CGPA…',
      icon:        GraduationCap,
      color:       '#60a5fa',
      hint:        'Highest qualifications',
    },
    {
      title:        'Resume / CV',
      kind:         'vault',
      icon:         FileText,
      color:        '#f472b6',
      hint:         'Your latest resume from Vault',
      expectedDocs: ['Resume', 'CV', 'Updated Resume'],
      matchKeywords: ['resume', 'cv', 'curriculum'],
    },
    {
      title:        'Offer Letters',
      kind:         'vault',
      icon:         BookMarked,
      color:        '#818cf8',
      hint:         'Job or internship offer letters',
      expectedDocs: ['Offer Letter', 'Appointment Letter', 'Employment Letter'],
      matchKeywords: ['offer', 'appointment', 'employment', 'joining'],
    },
    {
      title:        'Internship Documents',
      kind:         'vault',
      icon:         Briefcase,
      color:        '#34d399',
      hint:         'Internship proofs & completion certificates',
      expectedDocs: ['Offer Letter', 'Completion Certificate', 'Experience Letter'],
      matchKeywords: ['internship', 'completion', 'experience', 'training'],
    },
    {
      title:        'Certifications',
      kind:         'vault',
      icon:         Award,
      color:        '#fbbf24',
      hint:         'Course & professional certificates',
      expectedDocs: ['Course Certificate', 'Workshop Certificate', 'Training Certificate', 'Professional Certificate'],
      matchKeywords: ['certificate', 'certification', 'course', 'workshop', 'training'],
    },
    {
      title:        'Work Proof Images',
      kind:         'vault',
      icon:         Camera,
      color:        '#fb923c',
      hint:         'Screenshots, demos, work samples & photos',
      expectedDocs: ['Work Photos', 'Project Screenshots', 'Demo Images', 'Work Samples'],
      matchKeywords: ['work', 'proof', 'screenshot', 'demo', 'sample', 'photo'],
    },
  ],

  /* ══════════════════════════════════════════════════════════════════════
     ACADEMIC PORTFOLIO
     Full academic + entrance exams + language tests + financial docs.
  ══════════════════════════════════════════════════════════════════════ */
  academic: [
    {
      title:       'About Me',
      kind:        'text',
      placeholder: 'Brief academic introduction – field, goals, research interests…',
      icon:        User,
      color:       '#38bdf8',
      hint:        'Academic bio & objectives',
    },
    {
      title:       'Research Interests',
      kind:        'text',
      placeholder: 'Describe your research areas, topics, methodologies…',
      icon:        BookOpen,
      color:       '#34d399',
      hint:        'Academic focus & research areas',
    },
    {
      title:       'Education',
      kind:        'list',
      placeholder: 'Degree · Institution · Year · CGPA / Percentage…',
      icon:        GraduationCap,
      color:       '#a78bfa',
      hint:        '10th, 12th, UG / PG qualifications',
    },
    {
      title:       'Projects',
      kind:        'list',
      placeholder: 'Project title · domain · tools used · outcome…',
      icon:        FolderOpen,
      color:       '#fbbf24',
      hint:        'Academic or research projects',
    },
    {
      title:       'Skills',
      kind:        'list',
      placeholder: 'Add a skill (technical or academic)…',
      icon:        Star,
      color:       '#fb923c',
      hint:        'Technical, research & language skills',
    },
    /* ── Vault sections — 8 exactly as specified ── */
    {
      title:        'Personal Proofs',
      kind:         'vault',
      icon:         CreditCard,
      color:        '#60a5fa',
      hint:         'Government-issued identity documents',
      expectedDocs: ['Aadhaar Card', 'Passport', 'Visa Photo'],
      matchKeywords: ['aadhaar', 'passport', 'visa', 'id', 'identity', 'pan'],
    },
    {
      title:        'Academic',
      kind:         'vault',
      icon:         BookMarked,
      color:        '#818cf8',
      hint:         '10th, 12th, semester scorecards, degree & SOP/LOR',
      expectedDocs: [
        '10th Std Marksheet',
        '12th Std Marksheet',
        'College Certificates',
        'All Semester Scorecards',
        'Provisional Certificate',
        'Degree Certificate',
        'CMM (Consolidated Marksheet)',
        'MOI (Medium of Instruction) — Optional',
        'LOR (Letter of Recommendation)',
        'SOP (Statement of Purpose)',
      ],
      matchKeywords: [
        '10th', '12th', 'ssc', 'hsc', 'semester', 'scorecard', 'marksheet',
        'provisional', 'degree', 'cmm', 'consolidated', 'moi', 'medium',
        'lor', 'recommendation', 'sop', 'statement', 'college', 'certificate',
      ],
    },
    {
      title:        'Internships',
      kind:         'vault',
      icon:         Briefcase,
      color:        '#34d399',
      hint:         'Offer letter, completion certificate & work proof images',
      expectedDocs: ['Offer Letter', 'Completion Certificate', 'Work Proof Images'],
      matchKeywords: ['internship', 'offer', 'completion', 'work proof', 'experience'],
    },
    {
      title:        'Certifications',
      kind:         'vault',
      icon:         Award,
      color:        '#f472b6',
      hint:         'Online courses, workshops & hackathon certificates',
      expectedDocs: ['Online Course Certificate', 'Workshop Certificate', 'Hackathon Certificate'],
      matchKeywords: ['course', 'workshop', 'hackathon', 'certificate', 'certification', 'mooc', 'udemy', 'coursera'],
    },
    {
      title:        'Main Entrance Exams',
      kind:         'vault',
      icon:         Target,
      color:        '#ef4444',
      hint:         'GRE, GMAT & NEET score reports',
      expectedDocs: ['GRE Score Report', 'GMAT Score Report', 'NEET Scorecard'],
      matchKeywords: ['gre', 'gmat', 'neet', 'entrance', 'exam', 'score report'],
    },
    {
      title:        'Language Entrance Tests',
      kind:         'vault',
      icon:         Globe,
      color:        '#06b6d4',
      hint:         'IELTS, TOEFL, PTE & Duolingo score reports',
      expectedDocs: ['IELTS Score Report', 'TOEFL Score Report', 'PTE Score Report', 'Duolingo Score Report'],
      matchKeywords: ['ielts', 'toefl', 'pte', 'duolingo', 'english', 'language', 'proficiency'],
    },
    {
      title:        'Financial',
      kind:         'vault',
      icon:         DollarSign,
      color:        '#fbbf24',
      hint:         'ITRs & affidavits for financial proof',
      expectedDocs: ['ITR (Income Tax Return)', 'Affidavit of Support', 'Bank Statement'],
      matchKeywords: ['itr', 'income tax', 'affidavit', 'financial', 'bank', 'statement', 'sponsorship'],
    },
    {
      title:        'Others If Any',
      kind:         'vault',
      icon:         MoreHorizontal,
      color:        '#9ca3af',
      hint:         'Any additional supporting documents',
      matchKeywords: [],
    },
  ],

  /* ══════════════════════════════════════════════════════════════════════
     MASTERS PORTFOLIO
     Same as Academic + Publications section (for research papers / PhD)
  ══════════════════════════════════════════════════════════════════════ */
  masters: [
    {
      title:       'About Me',
      kind:        'text',
      placeholder: 'Brief introduction – research focus, aspirations, target programs…',
      icon:        User,
      color:       '#38bdf8',
      hint:        'Academic & research introduction',
    },
    {
      title:       'Research Interests',
      kind:        'text',
      placeholder: 'Describe your research areas, domain expertise, methodologies…',
      icon:        BookOpen,
      color:       '#34d399',
      hint:        'Research domain & academic focus',
    },
    {
      title:       'Education',
      kind:        'list',
      placeholder: 'Degree · Institution · Year · CGPA…',
      icon:        GraduationCap,
      color:       '#a78bfa',
      hint:        'Academic qualifications',
    },
    {
      title:       'Projects',
      kind:        'list',
      placeholder: 'Project title · domain · tools · outcome…',
      icon:        FolderOpen,
      color:       '#fbbf24',
      hint:        'Research or technical projects',
    },
    {
      title:       'Publications',
      kind:        'list',
      placeholder: 'Paper title · journal / conference · year · DOI…',
      icon:        Layers,
      color:       '#60a5fa',
      hint:        'Research papers, journals, conference submissions',
    },
    {
      title:       'Skills',
      kind:        'list',
      placeholder: 'Programming language, research tool, soft skill…',
      icon:        Star,
      color:       '#fb923c',
      hint:        'Technical & research skills',
    },
    /* ── Vault sections — identical to academic ── */
    {
      title:        'Personal Proofs',
      kind:         'vault',
      icon:         CreditCard,
      color:        '#60a5fa',
      hint:         'Government-issued identity documents',
      expectedDocs: ['Aadhaar Card', 'Passport', 'Visa Photo'],
      matchKeywords: ['aadhaar', 'passport', 'visa', 'id', 'identity', 'pan'],
    },
    {
      title:        'Academic',
      kind:         'vault',
      icon:         BookMarked,
      color:        '#818cf8',
      hint:         '10th, 12th, semester scorecards, degree & SOP/LOR',
      expectedDocs: [
        '10th Std Marksheet',
        '12th Std Marksheet',
        'College Certificates',
        'All Semester Scorecards',
        'Provisional Certificate',
        'Degree Certificate',
        'CMM (Consolidated Marksheet)',
        'MOI (Medium of Instruction) — Optional',
        'LOR (Letter of Recommendation)',
        'SOP (Statement of Purpose)',
      ],
      matchKeywords: [
        '10th', '12th', 'ssc', 'hsc', 'semester', 'scorecard', 'marksheet',
        'provisional', 'degree', 'cmm', 'consolidated', 'moi', 'medium',
        'lor', 'recommendation', 'sop', 'statement', 'college', 'certificate',
      ],
    },
    {
      title:        'Internships',
      kind:         'vault',
      icon:         Briefcase,
      color:        '#34d399',
      hint:         'Offer letter, completion certificate & work proof images',
      expectedDocs: ['Offer Letter', 'Completion Certificate', 'Work Proof Images'],
      matchKeywords: ['internship', 'offer', 'completion', 'work proof', 'experience'],
    },
    {
      title:        'Certifications',
      kind:         'vault',
      icon:         Award,
      color:        '#f472b6',
      hint:         'Online courses, workshops & hackathon certificates',
      expectedDocs: ['Online Course Certificate', 'Workshop Certificate', 'Hackathon Certificate'],
      matchKeywords: ['course', 'workshop', 'hackathon', 'certificate', 'certification', 'mooc', 'udemy', 'coursera'],
    },
    {
      title:        'Main Entrance Exams',
      kind:         'vault',
      icon:         Target,
      color:        '#ef4444',
      hint:         'GRE, GMAT & NEET score reports',
      expectedDocs: ['GRE Score Report', 'GMAT Score Report', 'NEET Scorecard'],
      matchKeywords: ['gre', 'gmat', 'neet', 'entrance', 'exam', 'score report'],
    },
    {
      title:        'Language Entrance Tests',
      kind:         'vault',
      icon:         Globe,
      color:        '#06b6d4',
      hint:         'IELTS, TOEFL, PTE & Duolingo score reports',
      expectedDocs: ['IELTS Score Report', 'TOEFL Score Report', 'PTE Score Report', 'Duolingo Score Report'],
      matchKeywords: ['ielts', 'toefl', 'pte', 'duolingo', 'english', 'language', 'proficiency'],
    },
    {
      title:        'Financial',
      kind:         'vault',
      icon:         DollarSign,
      color:        '#fbbf24',
      hint:         'ITRs & affidavits for financial proof',
      expectedDocs: ['ITR (Income Tax Return)', 'Affidavit of Support', 'Bank Statement'],
      matchKeywords: ['itr', 'income tax', 'affidavit', 'financial', 'bank', 'statement', 'sponsorship'],
    },
    {
      title:        'Others If Any',
      kind:         'vault',
      icon:         MoreHorizontal,
      color:        '#9ca3af',
      hint:         'Any additional supporting documents',
      matchKeywords: [],
    },
  ],
};

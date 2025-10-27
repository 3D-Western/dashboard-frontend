'use client';

import * as React from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';

const faqs = [
  {
    question: 'What does this service do?',
    answer:
      "3D Western is Western's official 3D printing club. Our printing service offers printing services of various materials and configurations to best suit your needs, whether it is for recreational or entrepreneurial purposes.",
  },
  {
    question: 'How much does printing cost?',
    answer:
      'It’s free! Users can upload their print files in STL format and we will print your 3D model for you according to the specifications you provide, as long as you are a student or faculty here at Western.',
  },
  {
    question: 'Can I print anything?',
    answer:
      'We encourage creativity, innovation and fun, but the following types of models are strictly prohibited and may result in account suspension and/or termination:\n\n1. NSFW (Not Safe For Work) material, including but not limited to explicit & adult content.\n2. Weapons: Weapon parts, or any tools that result in direct violence.\n3. Trolling or Harassment models: models containing discriminatory content or models designed to break the automated printing system.\n\n3D Western reserves the final right to revoke access to users for violating any of the above usage policies.',
  },
  {
    question: 'Do you store my data?',
    answer:
      '3D Western will only store user data and print files solely for the betterment of our printing service, including the following: your user email, student number, password, year of study, program details, and the print files you upload when using our service. For more details, please refer to our data policy.',
  },
  {
    question: 'How long will it take?',
    answer: 'TBD',
  },
];

export default function Page() {
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  const filteredFaqs = faqs.filter((faq) =>
    faq.question.toLowerCase().includes(debouncedQuery.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-center text-3xl font-bold">FAQs</h1>

      <h2 className="mb-2 text-2xl font-bold">What is this</h2>

      <Input
        type="text"
        placeholder="Finding something specific?"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-6 rounded-xs selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40"
      />

      <Accordion type="multiple" className="w-full">
        {filteredFaqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="cursor-pointer font-bold hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="pr-10 whitespace-pre-line">{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

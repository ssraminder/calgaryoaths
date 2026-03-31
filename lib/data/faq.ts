export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqGroup {
  id: string;
  label: string;
  items: FaqItem[];
}

export const faqGroups: FaqGroup[] = [
  {
    id: 'about',
    label: 'About Commissioner of Oaths',
    items: [
      {
        question: 'What is a Commissioner of Oaths?',
        answer: 'A Commissioner of Oaths is a person authorized by the provincial government to witness signatures on legal documents, administer oaths and affirmations, and certify copies of original documents. In Alberta, commissioners are appointed under the Commissioners for Oaths Act.',
      },
      {
        question: 'What is the difference between a Commissioner of Oaths and a Notary Public?',
        answer: 'A Commissioner of Oaths can witness signatures, administer oaths, and certify documents for use primarily within Canada. A Notary Public has broader authority and can authenticate documents for international use, including for apostille purposes. Calgary Oaths offers both — Raminder Shah is both a Commissioner of Oaths and a Notary Public.',
      },
      {
        question: 'Are documents commissioned in Alberta legally recognized across Canada?',
        answer: 'Yes. Documents commissioned by an Alberta Commissioner of Oaths are legally valid throughout Canada. For international use, Notary Public certification or apostille authentication may be required depending on the destination country.',
      },
      {
        question: 'Can commissioned documents be used outside Canada?',
        answer: 'It depends on the country and the document type. Many countries accept documents notarized by a Canadian Notary Public. For countries that have signed the Hague Apostille Convention, an apostille from Global Affairs Canada is the standard authentication. We can advise you based on your specific situation.',
      },
    ],
  },
  {
    id: 'appointments',
    label: 'Appointments & Hours',
    items: [
      {
        question: 'Do I need an appointment or can I walk in?',
        answer: 'Both! Walk-ins are welcome at both our Downtown Calgary and NE Calgary (Redstone) locations during business hours. If you want a guaranteed time slot or have multiple documents, booking an appointment online is recommended.',
      },
      {
        question: 'How long does a commissioning appointment take?',
        answer: 'Most appointments take 15–30 minutes. If we are drafting a document for you from scratch, allow 30–45 minutes. Complex documents like apostille requests may take longer — we will advise you when booking.',
      },
      {
        question: 'What are your hours?',
        answer: 'Both locations are open Monday–Friday 9:00 AM to 9:00 PM and Saturday 10:00 AM to 5:00 PM. Closed Sundays.',
      },
      {
        question: 'Do you offer same-day service?',
        answer: 'Yes. Same-day service is available at both locations during business hours. Walk in or book online for the same day. For urgent situations outside of business hours, call us at (587) 600-0746.',
      },
      {
        question: 'Do you offer mobile service — can you come to me?',
        answer: 'Yes. Our mobile commissioning service covers all Calgary neighbourhoods, plus Airdrie, Cochrane, and Chestermere by request. A travel fee of $30–$50 applies depending on your location. Call (587) 600-0746 or visit our mobile service page to book.',
      },
    ],
  },
  {
    id: 'what-to-bring',
    label: 'What to Bring',
    items: [
      {
        question: 'What ID do I need to bring?',
        answer: "You must bring a valid, government-issued photo ID. Acceptable IDs include: Canadian passport, provincial driver's licence, permanent resident card, or Canadian citizenship card. Expired IDs are not accepted.",
      },
      {
        question: 'Should I bring my own document, or can you draft it?',
        answer: 'Both options are available. If you already have a document prepared, bring it unsigned. If you need a document drafted, we offer drafting services for affidavits, statutory declarations, travel consent letters, and invitation letters. Just bring your ID and the relevant information.',
      },
      {
        question: 'Can you draft my document for me?',
        answer: 'Yes. We draft affidavits, statutory declarations, travel consent letters, and IRCC invitation letters. Drafting is included in our service fees. Bring your ID and the information you need in the document, and we handle the rest.',
      },
      {
        question: 'Should I sign my document before arriving?',
        answer: 'No. This is very important: do NOT sign your document before your appointment. The whole point of commissioning is that you sign the document in front of the commissioner. A pre-signed document cannot be commissioned.',
      },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing & Payment',
    items: [
      {
        question: 'How much does commissioning cost?',
        answer: 'Prices start at $30 for commissioning a document you bring yourself (already drafted). Affidavit drafting + commissioning is $40. Statutory declarations are $35. Travel consent letters and invitation letters are $40–$45 including drafting. See our full pricing page for all rates.',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept cash, credit/debit card, and Interac e-Transfer. Payment is collected at the time of service.',
      },
      {
        question: 'Is there a discount for multiple documents?',
        answer: 'Yes. Book 3 or more documents in a single appointment and receive a 10% discount on the total.',
      },
      {
        question: 'Is drafting included in the price?',
        answer: 'For affidavits, statutory declarations, travel consent letters, and invitation letters — yes, drafting is included in the listed price. There is no separate drafting fee. If you commission a document you have already drafted yourself, the lower "commissioning only" rate applies.',
      },
    ],
  },
  {
    id: 'specific-services',
    label: 'Specific Services',
    items: [
      {
        question: 'What do I need for a child travel consent letter?',
        answer: "Bring both parents' government-issued photo ID (or one parent if you have sole custody), the child's passport or birth certificate, your custody order if applicable, and the travel details (destination, dates, and the name of the adult travelling with the child). The letter must be commissioned — it is not valid with just a signature.",
      },
      {
        question: 'What does IRCC require for an invitation letter?',
        answer: "IRCC (Immigration, Refugees and Citizenship Canada) recommends a commissioned invitation letter for most visitor visa applications. The letter must include: your full name and Canadian address, your relationship to the visitor, the visitor's full name and passport number, purpose and dates of the visit, and a statement that you will host or financially support them.",
      },
      {
        question: 'What are statutory declarations commonly used for?',
        answer: 'Statutory declarations are used when you need to formally confirm facts in writing — for example, to declare a lost document (passport, SIN card, etc.), to confirm a common-law relationship for tax or benefits purposes, to support an insurance claim, or to make a name change declaration.',
      },
      {
        question: 'How does the apostille process work in Canada now?',
        answer: "Canada joined the Hague Apostille Convention in January 2024. Documents issued in Canada can now be authenticated via apostille by Global Affairs Canada for use in any of the 120+ Hague Convention member countries. The process typically involves notarization by a Canadian Notary Public followed by authentication through Global Affairs Canada. Contact us to discuss your specific documents and timeline.",
      },
    ],
  },
];

// Flat list of all FAQ items for schema markup
export const allFaqItems: FaqItem[] = faqGroups.flatMap((group) => group.items);

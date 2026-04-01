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
        answer: 'A Commissioner of Oaths can witness signatures, administer oaths, and certify documents for use primarily within Canada. A Notary Public has broader authority and can authenticate documents for international use, including for apostille purposes. Calgary Oaths offers both services.',
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
        answer: 'Both options are available. Walk-ins are welcome during business hours. If you want a guaranteed time slot or have multiple documents, booking an appointment online is recommended.',
      },
      {
        question: 'How long does a commissioning appointment take?',
        answer: 'Most appointments take 15–30 minutes. If we are drafting a document for you from scratch, allow 30–45 minutes. Complex documents like apostille requests may take longer — we will advise you when booking.',
      },
      {
        question: 'Do you offer same-day service?',
        answer: 'Yes. Same-day service is available during business hours. Walk in or book online for the same day. For urgent situations, call us at (587) 600-0746.',
      },
      {
        question: 'Do you offer mobile service — can you come to me?',
        answer: 'Yes. Our mobile commissioning service covers all Calgary neighbourhoods, plus Airdrie, Cochrane, and Chestermere by request. A distance-based travel fee applies (minimum $30). Select "Mobile" when booking and enter your address for an exact quote.',
      },
      {
        question: 'Do you offer virtual or remote commissioning?',
        answer: 'Virtual commissioning is available through select Notary Public and Barrister & Solicitor partners. Not all services can be completed virtually. Check availability during the booking process.',
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
        answer: 'Both options are available. If you already have a document prepared, bring it unsigned. If you need a document drafted, we offer drafting services for affidavits, statutory declarations, travel consent letters, invitation letters, and more.',
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
        question: 'How much does it cost?',
        answer: 'Prices vary by service and commissioner. When you book online, you pay a booking fee equal to the first document rate for your selected service. Additional documents are charged at your appointment. A $4.99 convenience fee and applicable taxes (5% GST in Alberta) are added to online bookings. Exact pricing is shown during the booking process.',
      },
      {
        question: 'What is the booking fee?',
        answer: 'The booking fee equals the minimum service charge — the rate for your first document. It secures your appointment and is not a separate fee. Additional documents, drafting fees, and mobile travel fees (if applicable) are collected at your appointment.',
      },
      {
        question: 'Is there a convenience fee?',
        answer: 'Yes, a $4.99 convenience fee is applied to all online bookings. This covers online payment processing and appointment management.',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'Credit/debit cards and Interac e-Transfer are accepted for online bookings. Cash, card, and e-Transfer are accepted at your appointment for any remaining balance.',
      },
      {
        question: 'Do prices vary between commissioners?',
        answer: 'Yes. Each commissioner sets their own rates. When you book online, you can compare prices across available commissioners for your selected service. The exact rate is shown before you confirm.',
      },
      {
        question: 'Is drafting included in the price?',
        answer: 'Some commissioners include drafting in their service rate; others charge a separate drafting fee. The full breakdown is shown during the booking process before you pay.',
      },
    ],
  },
  {
    id: 'specific-services',
    label: 'Specific Services',
    items: [
      {
        question: 'What do I need for a child travel consent letter?',
        answer: "Bring both parents' government-issued photo ID (or one parent if you have sole custody), the child's passport or birth certificate, your custody order if applicable, and the travel details (destination, dates, and the name of the adult travelling with the child).",
      },
      {
        question: 'What does IRCC require for an invitation letter?',
        answer: "IRCC recommends a commissioned invitation letter for most visitor visa applications. The letter must include: your full name and Canadian address, your relationship to the visitor, the visitor's full name and passport number, purpose and dates of the visit, and a statement that you will host or financially support them.",
      },
      {
        question: 'What are statutory declarations commonly used for?',
        answer: 'Statutory declarations are used to formally confirm facts — for example, to declare a lost document, confirm a common-law relationship, support an insurance claim, or make a name change declaration.',
      },
      {
        question: 'How does the apostille process work in Canada?',
        answer: 'Canada joined the Hague Apostille Convention in January 2024. Documents issued in Canada can now be authenticated via apostille by Global Affairs Canada for use in 120+ member countries. The process involves notarization by a Canadian Notary Public followed by authentication through Global Affairs Canada.',
      },
      {
        question: 'What is the difference between affidavit commissioning and affidavit drafting?',
        answer: 'Commissioning means we witness you sign a document you have already prepared — you bring it unsigned and sign in front of us. Drafting means we write the document for you from scratch based on the information you provide. Both include the official seal and signature.',
      },
      {
        question: 'What services require a Notary Public vs. a Commissioner of Oaths?',
        answer: 'Most domestic commissioning (affidavits, statutory declarations, consent letters) can be done by a Commissioner of Oaths. Certified true copies, power of attorney, will witnessing, document authentication for foreign use, and notarization require a Notary Public or Barrister & Solicitor.',
      },
    ],
  },
];

// Flat list of all FAQ items for schema markup
export const allFaqItems: FaqItem[] = faqGroups.flatMap((group) => group.items);

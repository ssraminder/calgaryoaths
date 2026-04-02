export const locations = [
  {
    id: 'downtown-calgary',
    slug: 'downtown-calgary',
    name: 'Downtown Calgary',
    commissionerId: 'raminder-shah',
    commissionerName: 'Raminder Shah',
    address: '421 7th Ave SW, Floor 30, Calgary, AB T2P 4K9',
    phone: '(587) 600-0746',
    parking: 'Paid parking available nearby. Accessible via CTrain.',
    nearbyNeighbourhoods: ['Beltline', '17th Ave SW', 'Mission', 'Cliff Bungalow', 'Victoria Park', 'Downtown Core'],
    googleMapsEmbed: 'https://maps.google.com/maps?q=421+7th+Ave+SW+Calgary&output=embed',
    mapUrl: 'https://maps.google.com/maps?q=421+7th+Ave+SW+Calgary',
    calendlyUrl: 'https://calendly.com/raminder-cethos/commissioner-downtown',
    hours: {
      weekdays: '9:00 AM – 9:00 PM',
      saturday: '10:00 AM – 5:00 PM',
      sunday: 'Closed',
    },
    geo: {
      latitude: 51.0355,
      longitude: -114.0826,
    },
  },
  {
    id: 'northeast-calgary',
    slug: 'northeast-calgary',
    name: 'NE Calgary — Redstone',
    commissionerId: 'amrita-shah',
    commissionerName: 'Amrita Shah',
    address: '220 Red Sky Terrace NE, Calgary, AB T3N 1M9',
    phone: '(587) 600-0746',
    parking: 'Free parking available nearby.',
    nearbyNeighbourhoods: ['Redstone', 'Cornerstone', 'Cityscape', 'Country Hills', 'Saddle Ridge', 'Falconridge', 'Taradale'],
    googleMapsEmbed: 'https://maps.google.com/maps?q=220+Red+Sky+Terrace+NE+Calgary+AB&output=embed',
    mapUrl: 'https://maps.google.com/maps?q=220+Red+Sky+Terrace+NE+Calgary+AB',
    calendlyUrl: 'https://calendly.com/raminder-cethos/commissioner-for-oaths-calgary-ne',
    hours: {
      weekdays: '9:00 AM – 9:00 PM',
      saturday: '10:00 AM – 5:00 PM',
      sunday: 'Closed',
    },
    geo: {
      latitude: 51.1645,
      longitude: -113.9742,
    },
  },
] as const;

export type Location = (typeof locations)[number];

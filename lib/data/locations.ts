export const locations = [
  {
    id: 'downtown-calgary',
    slug: 'downtown-calgary',
    name: 'Downtown Calgary',
    commissionerId: 'raminder-shah',
    commissionerName: 'Raminder Shah',
    address: '815 – 17th Ave SW, Calgary, AB T2T 0A1',
    phone: '(587) 600-0746',
    parking: 'Metered street parking available on 17th Ave SW. Pay parking lots within 1 block.',
    nearbyNeighbourhoods: ['Beltline', '17th Ave SW', 'Mission', 'Cliff Bungalow', 'Victoria Park', 'Downtown Core'],
    googleMapsEmbed: 'https://maps.google.com/maps?q=815+17th+Ave+SW+Calgary&output=embed',
    mapUrl: 'https://maps.google.com/maps?q=815+17th+Ave+SW+Calgary',
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
    address: '155 Redstone Walk NE, Calgary, AB T3J 0S4',
    phone: '(587) 600-0746',
    parking: 'Free parking available in the Redstone Walk complex.',
    nearbyNeighbourhoods: ['Redstone', 'Cornerstone', 'Cityscape', 'Country Hills', 'Saddle Ridge', 'Falconridge', 'Taradale'],
    googleMapsEmbed: 'https://maps.google.com/maps?q=155+Redstone+Walk+NE+Calgary&output=embed',
    mapUrl: 'https://maps.google.com/maps?q=155+Redstone+Walk+NE+Calgary',
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

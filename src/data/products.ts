import novaX1ProMax from '@/assets/novaphone-x1-pro-max.jpg';
import novaX1Pro from '@/assets/novaphone-x1-pro.jpg';
import novaX1 from '@/assets/novaphone-x1.jpg';
import novaS9ProMax from '@/assets/novaphone-s9-pro-max.jpg';
import novaS9Pro from '@/assets/novaphone-s9-pro.jpg';
import novaS9 from '@/assets/novaphone-s9.jpg';
import novaS8 from '@/assets/novaphone-s8.jpg';
import usbC20wAdapter from '@/assets/usb-c-20w-adapter.jpg';
import usbC30wAdapter from '@/assets/usb-c-30w-adapter.jpg';
import magsafeCharger from '@/assets/magsafe-charger.jpg';

export interface Product {
  id: string;
  name: string;
  model: string;
  price: number;
  originalPrice?: number;
  priceByStorage?: Record<string, number>;
  originalPriceByStorage?: Record<string, number>;
  image: string;
  colors: string[];
  storage: string[];
  features: string[];
  inStock: boolean;
  rating: number;
  reviews: number;
}

export const products: Product[] = [
  {
    id: '1',
    name: 'NovaPhone X1 Pro Max',
    model: 'NV-X1PM',
    price: 144900,
    originalPrice: 149900,
    image: novaX1ProMax,
    colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
    storage: ['256GB', '512GB', '1TB'],
    priceByStorage: {
      '256GB': 144900,
      '512GB': 164900,
      '1TB': 184900,
    },
    originalPriceByStorage: {
      '256GB': 149900,
      '512GB': 169900,
      '1TB': 189900,
    },
    features: [
      'Nova X1 Pro chip with 6-core GPU',
      'Pro camera system with 48MP Main',
      '6.9" Super AMOLED display',
      'Camera Control button',
      'Up to 33 hours video playback'
    ],
    inStock: true,
    rating: 4.9,
    reviews: 567
  },
  {
    id: '2',
    name: 'NovaPhone X1 Pro',
    model: 'NV-X1P',
    price: 119900,
    originalPrice: 124900,
    image: novaX1Pro,
    colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
    storage: ['128GB', '256GB', '512GB', '1TB'],
    priceByStorage: {
      '128GB': 119900,
      '256GB': 129900,
      '512GB': 149900,
      '1TB': 169900,
    },
    originalPriceByStorage: {
      '128GB': 124900,
      '256GB': 134900,
      '512GB': 154900,
      '1TB': 174900,
    },
    features: [
      'Nova X1 Pro chip with 6-core GPU',
      'Pro camera system with 48MP Main',
      '6.3" Super AMOLED display',
      'Camera Control button',
      'Up to 27 hours video playback'
    ],
    inStock: true,
    rating: 4.8,
    reviews: 423
  },
  {
    id: '3',
    name: 'NovaPhone X1',
    model: 'NV-X1',
    price: 79900,
    originalPrice: 84900,
    image: novaX1,
    colors: ['Black', 'White', 'Pink', 'Teal', 'Ultramarine'],
    storage: ['128GB', '256GB', '512GB'],
    priceByStorage: {
      '128GB': 79900,
      '256GB': 89900,
      '512GB': 99900,
    },
    originalPriceByStorage: {
      '128GB': 84900,
      '256GB': 94900,
      '512GB': 104900,
    },
    features: [
      'Nova X1 chip with 5-core GPU',
      'Advanced dual-camera system',
      '6.1" Super AMOLED display',
      'Action button',
      'Up to 22 hours video playback'
    ],
    inStock: true,
    rating: 4.7,
    reviews: 689
  },
  {
    id: '4',
    name: 'NovaPhone S9 Pro Max',
    model: 'NV-S9PM',
    price: 124900,
    originalPrice: 134900,
    image: novaS9ProMax,
    colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
    storage: ['256GB', '512GB', '1TB'],
    priceByStorage: {
      '256GB': 124900,
      '512GB': 144900,
      '1TB': 164900,
    },
    originalPriceByStorage: {
      '256GB': 134900,
      '512GB': 154900,
      '1TB': 174900,
    },
    features: [
      'Nova S9 Pro chip with 6-core GPU',
      'Pro camera system with 48MP Main',
      '6.7" Super AMOLED display',
      'Action button',
      'Up to 29 hours video playback'
    ],
    inStock: true,
    rating: 4.8,
    reviews: 1245
  },
  {
    id: '5',
    name: 'NovaPhone S9 Pro',
    model: 'NV-S9P',
    price: 109900,
    originalPrice: 119900,
    image: novaS9Pro,
    colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
    storage: ['128GB', '256GB', '512GB', '1TB'],
    priceByStorage: {
      '128GB': 109900,
      '256GB': 119900,
      '512GB': 139900,
      '1TB': 159900,
    },
    originalPriceByStorage: {
      '128GB': 119900,
      '256GB': 129900,
      '512GB': 149900,
      '1TB': 169900,
    },
    features: [
      'Nova S9 Pro chip with 6-core GPU',
      'Pro camera system with 48MP Main',
      '6.1" Super AMOLED display',
      'Action button',
      'Up to 23 hours video playback'
    ],
    inStock: true,
    rating: 4.8,
    reviews: 934
  },
  {
    id: '6',
    name: 'NovaPhone S9',
    model: 'NV-S9',
    price: 69900,
    originalPrice: 79900,
    image: novaS9,
    colors: ['Pink', 'Yellow', 'Green', 'Blue', 'Black'],
    storage: ['128GB', '256GB', '512GB'],
    priceByStorage: {
      '128GB': 69900,
      '256GB': 79900,
      '512GB': 89900,
    },
    originalPriceByStorage: {
      '128GB': 79900,
      '256GB': 89900,
      '512GB': 99900,
    },
    features: [
      'Nova S9 chip',
      'Advanced dual-camera system',
      '6.1" Super AMOLED display',
      'Dynamic Island',
      'Up to 20 hours video playback'
    ],
    inStock: true,
    rating: 4.7,
    reviews: 892
  },
  {
    id: '7',
    name: 'NovaPhone S8',
    model: 'NV-S8',
    price: 59900,
    originalPrice: 69900,
    image: novaS8,
    colors: ['Midnight', 'Purple', 'Starlight', 'Blue', 'Red'],
    storage: ['128GB', '256GB', '512GB'],
    priceByStorage: {
      '128GB': 59900,
      '256GB': 69900,
      '512GB': 79900,
    },
    originalPriceByStorage: {
      '128GB': 69900,
      '256GB': 79900,
      '512GB': 89900,
    },
    features: [
      'Nova S8 chip',
      'Advanced dual-camera system',
      '6.1" Super AMOLED display',
      'Ceramic Shield front',
      'Up to 20 hours video playback'
    ],
    inStock: true,
    rating: 4.6,
    reviews: 2156
  },
  {
    id: '8',
    name: 'USB-C 20W Power Adapter',
    model: 'NV-A20',
    price: 1900,
    originalPrice: 2400,
    image: usbC20wAdapter,
    colors: ['White'],
    storage: [],
    features: [
      'Fast charging for smartphones',
      'USB-C port',
      '20W output',
      'Compact design',
      'Compatible with all NovaPhones'
    ],
    inStock: true,
    rating: 4.5,
    reviews: 892
  },
  {
    id: '9',
    name: 'USB-C 30W Power Adapter',
    model: 'NV-A30',
    price: 2900,
    originalPrice: 3400,
    image: usbC30wAdapter,
    colors: ['White'],
    storage: [],
    features: [
      'Fast charging for smartphones and tablets',
      'USB-C port',
      '30W output',
      'Premium build quality',
      'Universal compatibility'
    ],
    inStock: true,
    rating: 4.7,
    reviews: 645
  },
  {
    id: '10',
    name: 'NovaSafe Wireless Charger',
    model: 'NV-WC1',
    price: 3900,
    originalPrice: 4500,
    image: magsafeCharger,
    colors: ['White'],
    storage: [],
    features: [
      'Wireless charging for smartphones',
      'Magnetic alignment',
      'Up to 15W charging',
      '1m USB-C cable',
      'Compatible with NovaPhone S9 and later'
    ],
    inStock: true,
    rating: 4.8,
    reviews: 1234
  }
];

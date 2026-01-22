import { CheckCircle, TrendingUp, Shield, Truck } from 'lucide-react';

interface ValueProp {
  title: string;
  description: string;
  icon?: string;
}

interface ValuePropsProps {
  title?: string | null;
  items?: ValueProp[] | null;
}

const defaultItems: ValueProp[] = [
  {
    title: 'Produk Original',
    description: '100% produk asli dan bergaransi',
    icon: 'CheckCircle'
  },
  {
    title: 'Harga Terbaik',
    description: 'Harga kompetitif langsung dari distributor',
    icon: 'TrendingUp'
  },
  {
    title: 'Pengiriman Cepat',
    description: 'Kirim ke seluruh Indonesia',
    icon: 'Truck'
  },
  {
    title: 'Konsultasi Gratis',
    description: 'Tim ahli siap membantu Anda',
    icon: 'Shield'
  }
];

const iconMap: Record<string, any> = {
  CheckCircle,
  TrendingUp,
  Shield,
  Truck
};

export default function ValueProps({ 
  title,
  items 
}: ValuePropsProps) {
  // Parse items jika berupa string (JSON)
  let parsedItems: ValueProp[] = [];
  
  if (items) {
    if (typeof items === 'string') {
      try {
        parsedItems = JSON.parse(items);
      } catch {
        parsedItems = [];
      }
    } else if (Array.isArray(items)) {
      parsedItems = items;
    }
  }

  // Use default items if no items provided
  const displayItems = parsedItems.length > 0 ? parsedItems.slice(0, 4) : defaultItems;

  return (
    <section className="py-10 sm:py-12 md:py-14 lg:py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6 md:gap-7 lg:gap-8">
          {displayItems.map((item, index) => {
            const iconName = item.icon || defaultItems[index]?.icon || 'CheckCircle';
            const IconComponent = iconMap[iconName] || CheckCircle;
            
            return (
              <div key={index} className="text-center">
                <div className="bg-green-100 w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <IconComponent className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 text-green-700" />
                </div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base md:text-lg">{item.title}</h3>
                <p className="text-xs sm:text-sm md:text-base text-gray-600">{item.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

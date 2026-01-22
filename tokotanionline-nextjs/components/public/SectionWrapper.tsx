/**
 * SectionWrapper - Pure presentational component
 * 
 * Wraps content sections with consistent title styling
 * Server component only - no client logic
 */

interface SectionWrapperProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function SectionWrapper({
  title,
  subtitle,
  children,
}: SectionWrapperProps) {
  return (
    <section className="py-6 sm:py-8 md:py-10 lg:py-16">
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8">
        <div className="text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12">
          <h2 className="text-xl sm:text-2xl md:text-2.5xl lg:text-3xl font-bold mb-2.5 sm:mb-3 md:mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm md:text-base text-gray-600 max-w-2xl mx-auto px-4">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

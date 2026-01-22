/**
 * SEO Head Component
 * Injects JSON-LD schemas and meta tags
 * Safe to use on any page
 */

'use client';

import Script from 'next/script';

interface SEOHeadProps {
  schema?: object | string;
  additionalSchemas?: Array<object | string>;
}

export default function SEOHead({ schema, additionalSchemas = [] }: SEOHeadProps) {
  const schemas = schema ? [schema, ...additionalSchemas] : additionalSchemas;

  if (schemas.length === 0) return null;

  return (
    <>
      {schemas.map((schemaObj, index) => {
        const schemaJson =
          typeof schemaObj === 'string' ? schemaObj : JSON.stringify(schemaObj);
        return (
          <Script
            key={index}
            id={`seo-schema-${index}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: schemaJson }}
          />
        );
      })}
    </>
  );
}
















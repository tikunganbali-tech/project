/**
 * ProductAdditionalInfo - Pure presentational component
 * 
 * Displays additional product information if available
 * Server component only - no client logic
 */

interface ProductAdditionalInfoProps {
  additionalInfo: {
    problemSolution: string | null;
    applicationMethod: string | null;
    dosage: string | null;
    advantages: string | null;
    safetyNotes: string | null;
  };
}

export default function ProductAdditionalInfo({ additionalInfo }: ProductAdditionalInfoProps) {
  // Check if any additional info exists
  const hasAnyInfo = 
    additionalInfo.problemSolution ||
    additionalInfo.applicationMethod ||
    additionalInfo.dosage ||
    additionalInfo.advantages ||
    additionalInfo.safetyNotes;

  if (!hasAnyInfo) {
    return null;
  }

  return (
    <div className="space-y-4 pt-6 border-t">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Informasi Tambahan</h2>
      
      <div className="space-y-4">
        {additionalInfo.problemSolution && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Masalah & Solusi</h3>
            <div className="text-gray-700 whitespace-pre-wrap text-sm">
              {additionalInfo.problemSolution}
            </div>
          </div>
        )}

        {additionalInfo.applicationMethod && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Cara Aplikasi</h3>
            <div className="text-gray-700 whitespace-pre-wrap text-sm">
              {additionalInfo.applicationMethod}
            </div>
          </div>
        )}

        {additionalInfo.dosage && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Dosis</h3>
            <div className="text-gray-700 whitespace-pre-wrap text-sm">
              {additionalInfo.dosage}
            </div>
          </div>
        )}

        {additionalInfo.advantages && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Keunggulan</h3>
            <div className="text-gray-700 whitespace-pre-wrap text-sm">
              {additionalInfo.advantages}
            </div>
          </div>
        )}

        {additionalInfo.safetyNotes && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Catatan Keamanan</h3>
            <div className="text-gray-700 whitespace-pre-wrap text-sm">
              {additionalInfo.safetyNotes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

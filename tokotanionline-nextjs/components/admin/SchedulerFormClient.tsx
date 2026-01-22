/**
 * PHASE UI-A: Scheduler Form Client Component
 * 
 * Create/Edit form for ContentSchedule
 * - Simple and human-friendly fields
 * - No technical terms
 * - No CRON or API keys
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Loader } from 'lucide-react';
import Link from 'next/link';

const scheduleSchema = z.object({
  name: z.string().min(1, 'Nama scheduler diperlukan'),
  mode: z.enum(['BLOG', 'PRODUCT'], { required_error: 'Mode diperlukan' }),
  status: z.enum(['ACTIVE', 'PAUSED']),
  productionPerDay: z.number().int().min(1).max(10),
  startDate: z.string().min(1, 'Tanggal mulai diperlukan'),
  endDate: z.string().optional().nullable(),
  publishMode: z.enum(['AUTO_PUBLISH', 'DRAFT_ONLY', 'QC_REQUIRED']),
  timeWindowStart: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Format: HH:mm'),
  timeWindowEnd: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Format: HH:mm'),
}).refine((data) => {
  // Validate time window
  const [startHour, startMin] = data.timeWindowStart.split(':').map(Number);
  const [endHour, endMin] = data.timeWindowEnd.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return endMinutes > startMinutes;
}, {
  message: 'Jam selesai harus setelah jam mulai',
  path: ['timeWindowEnd'],
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface SchedulerFormClientProps {
  schedule?: any; // Existing schedule for edit mode
}

export default function SchedulerFormClient({ schedule }: SchedulerFormClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: schedule
      ? {
          name: schedule.name,
          mode: schedule.mode,
          status: schedule.status,
          productionPerDay: schedule.productionPerDay,
          startDate: schedule.startDate ? new Date(schedule.startDate).toISOString().slice(0, 16) : '',
          endDate: schedule.endDate ? new Date(schedule.endDate).toISOString().slice(0, 16) : null,
          publishMode: schedule.publishMode,
          timeWindowStart: schedule.timeWindowStart,
          timeWindowEnd: schedule.timeWindowEnd,
        }
      : {
          status: 'PAUSED',
          productionPerDay: 3,
          publishMode: 'DRAFT_ONLY',
          timeWindowStart: '09:00',
          timeWindowEnd: '21:00',
        },
  });

  const endDateEnabled = watch('endDate');

  const onSubmit = async (data: ScheduleFormData) => {
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      };

      const url = schedule
        ? `/api/admin/schedules/${schedule.id}`
        : '/api/admin/schedules';

      const method = schedule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        router.push('/admin/scheduler');
      } else {
        setError(result.error || 'Gagal menyimpan scheduler');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menyimpan');
    } finally {
      setLoading(false);
    }
  };

  // Set default start date to today if not editing
  useEffect(() => {
    if (!schedule) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setValue('startDate', today.toISOString().slice(0, 16));
    }
  }, [schedule, setValue]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/scheduler"
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          {schedule ? 'Edit Scheduler' : 'Buat Scheduler Baru'}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow p-6 space-y-8">
        {/* Informasi Dasar */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Informasi Dasar</h2>

          <div className="space-y-4">
            {/* Nama Scheduler */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Scheduler *
              </label>
              <input
                type="text"
                {...register('name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Contoh: Scheduler Blog Harian"
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mode *
              </label>
              <select
                {...register('mode')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pilih Mode</option>
                <option value="BLOG">Blog</option>
                <option value="PRODUCT">Product</option>
              </select>
              {errors.mode && (
                <p className="text-red-600 text-sm mt-1">{errors.mode.message}</p>
              )}
            </div>

            {/* Produksi per Hari */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jumlah Produksi per Hari *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                {...register('productionPerDay', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Jumlah konten yang akan diproduksi setiap hari (1-10)
              </p>
              {errors.productionPerDay && (
                <p className="text-red-600 text-sm mt-1">{errors.productionPerDay.message}</p>
              )}
            </div>

            {/* Mode Publish */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mode Publish *
              </label>
              <select
                {...register('publishMode')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="DRAFT_ONLY">Draft Only (default)</option>
                <option value="AUTO_PUBLISH">Auto Publish</option>
                <option value="QC_REQUIRED">QC Required</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Draft Only: Simpan sebagai draft, tidak auto publish
              </p>
              {errors.publishMode && (
                <p className="text-red-600 text-sm mt-1">{errors.publishMode.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Waktu */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Waktu</h2>

          <div className="space-y-4">
            {/* Tanggal Mulai */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Mulai *
              </label>
              <input
                type="datetime-local"
                {...register('startDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {errors.startDate && (
                <p className="text-red-600 text-sm mt-1">{errors.startDate.message}</p>
              )}
            </div>

            {/* Tanggal Selesai (Opsional) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <input
                  type="checkbox"
                  checked={!!endDateEnabled}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      setValue('endDate', null);
                    } else {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setValue('endDate', tomorrow.toISOString().slice(0, 16));
                    }
                  }}
                  className="rounded"
                />
                <span>Tanggal Selesai (Opsional)</span>
              </label>
              {endDateEnabled && (
                <input
                  type="datetime-local"
                  {...register('endDate')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mt-2"
                />
              )}
              {errors.endDate && (
                <p className="text-red-600 text-sm mt-1">{errors.endDate.message}</p>
              )}
            </div>

            {/* Jam Aktif */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dari Jam *
                </label>
                <input
                  type="time"
                  {...register('timeWindowStart')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.timeWindowStart && (
                  <p className="text-red-600 text-sm mt-1">{errors.timeWindowStart.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sampai Jam *
                </label>
                <input
                  type="time"
                  {...register('timeWindowEnd')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.timeWindowEnd && (
                  <p className="text-red-600 text-sm mt-1">{errors.timeWindowEnd.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Status</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="PAUSED">PAUSED</option>
              <option value="ACTIVE">ACTIVE</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              ACTIVE: Scheduler akan berjalan | PAUSED: Scheduler dihentikan sementara
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Link
            href="/admin/scheduler"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Simpan
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

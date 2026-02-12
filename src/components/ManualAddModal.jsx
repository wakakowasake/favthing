import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ZINDEX } from '../constants/zIndex';
import { convertImageFileToDataUrl } from '../utils/imageUpload';

const EMPTY_INITIAL_VALUES = Object.freeze({});

const buildInitialForm = (fields, initialValues = {}) => {
  const base = { image: '', userRating: 0 };
  fields.forEach((field) => {
    base[field.name] = '';
  });
  return { ...base, ...initialValues };
};

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export default function ManualAddModal({
  isOpen,
  title,
  subtitle,
  imageLabel = '이미지',
  submitLabel = '추가하기',
  fields = [],
  initialValues,
  onSubmit,
  onClose,
}) {
  const safeInitialValues = initialValues ?? EMPTY_INITIAL_VALUES;
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(() => buildInitialForm(fields, safeInitialValues));
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const currentRating = toNumber(form.userRating);
  const hasImage = Boolean(form.image);
  const requiredFields = useMemo(
    () => fields.filter((field) => field.required).map((field) => field.name),
    [fields]
  );

  useEffect(() => {
    if (!isOpen) return;
    setForm(buildInitialForm(fields, safeInitialValues));
    setHoverRating(0);
    setErrorMessage('');
    setIsSubmitting(false);
  }, [isOpen, fields, safeInitialValues]);

  if (!isOpen) {
    return null;
  }

  const setFieldValue = (fieldName, value) => {
    setForm((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage('');
      const dataUrl = await convertImageFileToDataUrl(file);
      setFieldValue('image', dataUrl);
    } catch (error) {
      setErrorMessage(error.message || '이미지 업로드에 실패했습니다.');
    } finally {
      event.target.value = '';
    }
  };

  const clearImage = () => {
    setFieldValue('image', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    for (const fieldName of requiredFields) {
      const value = form[fieldName];
      if (!String(value ?? '').trim()) {
        const field = fields.find((item) => item.name === fieldName);
        return `${field?.label || fieldName}은(는) 필수입니다.`;
      }
    }
    return '';
  };

  const normalizePayload = () => {
    const payload = {};
    Object.keys(form).forEach((key) => {
      const value = form[key];
      payload[key] = typeof value === 'string' ? value.trim() : value;
    });

    const normalizedRating = toNumber(payload.userRating);
    payload.userRating = normalizedRating > 0 ? String(normalizedRating) : '';
    payload.image = payload.image || '';
    return payload;
  };

  const getPointerRating = (event, starIndex) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    return x < rect.width / 2 ? starIndex - 0.5 : starIndex;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const payload = normalizePayload();
      await onSubmit?.(payload);
      onClose?.();
    } catch (error) {
      setErrorMessage(error.message || '직접 추가에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"
      style={{ zIndex: ZINDEX.MODAL_OVERLAY }}
    >
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 p-5 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-primary">{title}</h2>
            {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl" type="button">
            ×
          </button>
        </div>

        <form className="p-5 space-y-5" onSubmit={handleSubmit}>
          <div className="bg-gray-800/70 rounded-lg p-4">
            <p className="text-white font-bold mb-3">{imageLabel}</p>
            {hasImage ? (
              <div className="flex items-start gap-3">
                <img src={form.image} alt="upload preview" className="w-24 h-32 object-cover rounded border border-gray-700" />
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-bold transition"
                  >
                    이미지 변경
                  </button>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="px-3 py-2 bg-red-700/70 hover:bg-red-700 text-white rounded text-sm font-bold transition"
                  >
                    이미지 제거
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-dashed border-gray-600 rounded-lg p-6 text-gray-300 hover:border-primary hover:text-white transition"
              >
                <span className="material-icons-outlined align-middle mr-2">upload</span>
                이미지 업로드
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <p className="text-xs text-gray-500 mt-2">JPG/PNG 업로드 가능. 자동으로 압축 저장됩니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.map((field) => (
              <label key={field.name} className={`flex flex-col gap-2 ${field.multiline ? 'md:col-span-2' : ''}`}>
                <span className="text-sm text-gray-300 font-bold">
                  {field.label}
                  {field.required ? ' *' : ''}
                </span>
                {field.multiline ? (
                  <textarea
                    value={form[field.name] ?? ''}
                    onChange={(event) => setFieldValue(field.name, event.target.value)}
                    placeholder={field.placeholder || ''}
                    rows={field.rows || 4}
                    className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={form[field.name] ?? ''}
                    onChange={(event) => setFieldValue(field.name, event.target.value)}
                    placeholder={field.placeholder || ''}
                    className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </label>
            ))}
          </div>

          <div className="bg-gray-800/70 rounded-lg p-4 text-center">
            <p className="text-white font-bold mb-3">내 평점 (선택)</p>
            <div className="flex justify-center gap-2 text-6xl mb-3">
              {[1, 2, 3, 4, 5].map((starIndex) => {
                const displayRating = hoverRating > 0 ? hoverRating : currentRating;
                const fillPercentage = Math.max(0, Math.min(displayRating - (starIndex - 1), 1));
                const handleMouseMove = (event) => {
                  setHoverRating(getPointerRating(event, starIndex));
                };

                const handleStarClick = (event) => {
                  event.stopPropagation();
                  const selectedRating = hoverRating > 0 ? hoverRating : getPointerRating(event, starIndex);
                  setFieldValue('userRating', selectedRating);
                  setHoverRating(0);
                };

                return (
                  <button
                    key={starIndex}
                    type="button"
                    className="relative cursor-pointer focus:outline-none"
                    style={{ width: '60px', height: '60px', padding: 0, border: 'none', background: 'none' }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={handleStarClick}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
                      ★
                    </div>
                    {fillPercentage > 0 && (
                      <div
                        className="absolute inset-0 flex items-center justify-center text-primary pointer-events-none"
                        style={{ clipPath: `inset(0 ${(1 - fillPercentage) * 100}% 0 0)` }}
                      >
                        ★
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className={`font-bold min-h-[1.5rem] ${currentRating > 0 ? 'text-primary text-xl' : 'text-gray-400 text-sm'}`}>
              {currentRating > 0 ? `${currentRating}점` : '평점 없음'}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded border border-red-500 text-red-300 bg-red-900/20 text-sm">
              {errorMessage}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded transition"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-primary hover:bg-red-700 text-white font-bold rounded transition disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? '저장 중...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
